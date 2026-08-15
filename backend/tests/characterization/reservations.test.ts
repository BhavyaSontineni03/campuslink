import request from 'supertest';
import app from '../../src/app';
import pool from '../../src/config/database';
import { signToken } from '../../src/utils/jwt';

// Builds its own dedicated session with capacity 2 rather than relying on the seed
// data's existing approved/waitlisted counts, which don't actually reflect a
// full-capacity session (e.g. session id 3 has 5 approved out of capacity 8 - plenty
// of room, despite one seed row being marked "waitlisted"). A fresh, controlled
// scenario is the only reliable way to exercise the capacity/waitlist boundary.
describe('Characterization: reservation + waitlist behavior (pre-Postgres baseline)', () => {
  const capacity = 2;
  let sessionId: number;
  let createdUserIds: number[] = [];
  let waitlistedReservationId: number;

  async function makeTestUser(name: string): Promise<{ id: number; token: string }> {
    const res = await request(app).post('/api/auth/register').send({
      email: `char-${name}-${Date.now()}@university.edu`,
      name,
      password: 'password123',
    });
    createdUserIds.push(res.body.data.user.id);
    return { id: res.body.data.user.id, token: res.body.data.token };
  }

  beforeAll(async () => {
    // created_by = 4 ("Diana Prince", role organizer, per database/init/04-seed.sql).
    const { rows } = await pool.query(
      `INSERT INTO sessions (title, description, category, start_time, end_time, capacity, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        'Characterization Test Session',
        'Created by an automated test, safe to delete',
        'Test',
        '2030-01-15 10:00:00',
        '2030-01-15 11:00:00',
        capacity,
        'Test Location',
        4,
      ]
    );
    sessionId = rows[0].id;
  });

  afterAll(async () => {
    // Delete by session_id (known from beforeAll, not dependent on any test having
    // run/passed) rather than tracking individual reservation ids - a mid-run
    // assertion failure would otherwise skip the push and leak the row, which then
    // orphans it against the users FK below and aborts cleanup entirely.
    await pool.query('DELETE FROM reservations WHERE session_id = $1', [sessionId]);
    if (createdUserIds.length) {
      await pool.query(
        `DELETE FROM users WHERE id IN (${createdUserIds.map((_, i) => `$${i + 1}`).join(',')})`,
        createdUserIds
      );
    }
    if (sessionId) {
      await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    }
  });

  it('approves reservations up to capacity', async () => {
    const userA = await makeTestUser('seat-a');
    const userB = await makeTestUser('seat-b');

    const resA = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ user_id: userA.id, session_id: sessionId });
    const resB = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ user_id: userB.id, session_id: sessionId });

    expect(resA.body.data.status).toBe('approved');
    expect(resB.body.data.status).toBe('approved');
  });

  it('waitlists a new reservation once the session is at capacity', async () => {
    const userC = await makeTestUser('waitlist-check');

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${userC.token}`)
      .send({ user_id: userC.id, session_id: sessionId });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('waitlisted');
    waitlistedReservationId = res.body.data.reservation_id;
  });

  it('promotes the earliest waitlisted reservation when an approved seat cancels', async () => {
    // At this point the session (capacity 2) has userA + userB approved and userC
    // waitlisted, from the two tests above running in file order.
    const { rows: approvedRows } = await pool.query(
      'SELECT id, user_id FROM reservations WHERE session_id = $1 AND status = $2 LIMIT 1',
      [sessionId, 'approved']
    );
    const approvedReservationId = approvedRows[0].id;
    const ownerId = approvedRows[0].user_id;

    // Sign a fresh token for whichever seat-holder owns this reservation, rather than
    // threading the original token through from the first test - keeps this test
    // self-contained.
    const cancelToken = signToken({ userId: ownerId, role: 'student' });

    // cancelReservation reads user_id from the request body, not from the verified
    // token (see backend/src/controllers/reservationController.ts) - characterizing
    // that as-is, since this test's job is to lock in current behavior, not fix it.
    // Flagged separately as a follow-up: reservation endpoints trust a client-supplied
    // user_id instead of the authenticated identity, which is worth closing before
    // this app is called production-ready.
    const cancelRes = await request(app)
      .patch(`/api/reservations/${approvedReservationId}/cancel`)
      .set('Authorization', `Bearer ${cancelToken}`)
      .send({ user_id: ownerId });
    expect(cancelRes.status).toBe(200);

    // promoteFromWaitlist (backend/src/models/Reservation.ts) actually awaits the
    // promotion UPDATE+COMMIT before the cancel endpoint responds today - only the
    // follow-up notification is deferred via setImmediate - so this poll's first
    // iteration always succeeds right now. Polling anyway rather than asserting
    // immediately keeps this test from silently depending on that being awaited,
    // since it's not part of the documented contract this baseline is pinning down.
    let promoted = false;
    for (let attempt = 0; attempt < 10 && !promoted; attempt++) {
      const { rows } = await pool.query(
        'SELECT status FROM reservations WHERE id = $1',
        [waitlistedReservationId]
      );
      promoted = rows[0].status === 'approved';
      if (!promoted) await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(promoted).toBe(true);
  });
});

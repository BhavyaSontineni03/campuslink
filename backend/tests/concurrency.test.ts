import request from 'supertest';
import app from '../src/app';
import pool from '../src/config/database';

// Creates an isolated session with a known small capacity so campus seed data
// cannot steal waitlist promotions or inflate approved counts.
describe('Concurrency Tests', () => {
  let testSessionId = 0;
  let organizerId = 0;
  let createdUserIds: number[] = [];
  let createdReservationIds: number[] = [];
  const CAPACITY = 3;

  async function makeTestUser(label: string): Promise<{ id: number; token: string }> {
    const res = await request(app).post('/api/auth/register').send({
      email: `concurrency-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@university.edu`,
      name: `Concurrency Test ${label}`,
      password: 'password123',
    });
    createdUserIds.push(res.body.data.user.id);
    return { id: res.body.data.user.id, token: res.body.data.token };
  }

  beforeAll(async () => {
    const organizer = await makeTestUser('organizer');
    organizerId = organizer.id;
    await pool.query(`UPDATE users SET role = 'organizer' WHERE id = $1`, [organizerId]);

    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const { rows } = await pool.query(
      `INSERT INTO sessions (title, description, category, start_time, end_time, capacity, location, created_by, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        'Concurrency Isolation Session',
        'Isolated session for concurrency tests',
        'Academic',
        start.toISOString(),
        end.toISOString(),
        CAPACITY,
        'Test Hall 1',
        organizerId,
        ['academic', 'workshop'],
      ]
    );
    testSessionId = rows[0].id;
  });

  afterEach(async () => {
    if (createdReservationIds.length) {
      await pool.query(
        `DELETE FROM reservations WHERE id = ANY($1::int[])`,
        [createdReservationIds]
      );
      createdReservationIds = [];
    }
    // Also clear any other reservations on the isolated session between tests
    await pool.query(`DELETE FROM reservations WHERE session_id = $1`, [testSessionId]);
  });

  afterAll(async () => {
    if (testSessionId) {
      await pool.query(`DELETE FROM reservations WHERE session_id = $1`, [testSessionId]);
      await pool.query(`DELETE FROM sessions WHERE id = $1`, [testSessionId]);
    }
    if (createdUserIds.length) {
      await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [createdUserIds]);
    }
  });

  describe('Reservation Concurrency', () => {
    it('should handle concurrent bookings without overbooking', async () => {
      const users = await Promise.all(
        Array(10)
          .fill(null)
          .map((_, i) => makeTestUser(`overbook-${i}`))
      );

      const results = await Promise.all(
        users.map((user) =>
          request(app)
            .post('/api/reservations')
            .set('Authorization', `Bearer ${user.token}`)
            .send({ user_id: user.id, session_id: testSessionId })
        )
      );

      results.forEach((r) => {
        if (r.body?.data?.reservation_id) createdReservationIds.push(r.body.data.reservation_id);
      });

      const successfulBookings = results.filter((r) => r.status === 201).length;
      const approvedCount = results.filter((r) => r.body.data?.status === 'approved').length;
      const waitlistedCount = results.filter((r) => r.body.data?.status === 'waitlisted').length;

      expect(approvedCount).toBeLessThanOrEqual(CAPACITY);
      expect(approvedCount + waitlistedCount).toBe(successfulBookings);
    });

    it('should promote waitlist on cancellation', async () => {
      const seatUsers: { id: number; token: string }[] = [];
      for (let i = 0; i < CAPACITY; i++) {
        const user = await makeTestUser(`seat-${i}`);
        const res = await request(app)
          .post('/api/reservations')
          .set('Authorization', `Bearer ${user.token}`)
          .send({ user_id: user.id, session_id: testSessionId });
        createdReservationIds.push(res.body.data.reservation_id);
        seatUsers.push(user);
      }

      const waitlistUser = await makeTestUser('waitlisted');
      const waitlistResponse = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${waitlistUser.token}`)
        .send({ user_id: waitlistUser.id, session_id: testSessionId });
      createdReservationIds.push(waitlistResponse.body.data.reservation_id);

      expect(waitlistResponse.body.data.status).toBe('waitlisted');

      const firstSeatUser = seatUsers[0];
      const cancelRes = await request(app)
        .patch(`/api/reservations/${createdReservationIds[0]}/cancel`)
        .set('Authorization', `Bearer ${firstSeatUser.token}`)
        .send({ user_id: firstSeatUser.id });
      expect(cancelRes.status).toBe(200);

      const { rows: updatedRows } = await pool.query(
        'SELECT status FROM reservations WHERE id = $1',
        [waitlistResponse.body.data.reservation_id]
      );
      expect(updatedRows[0].status).toBe('approved');
    });

    it('should prevent duplicate reservations', async () => {
      const user = await makeTestUser('duplicate');

      const firstResponse = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ user_id: user.id, session_id: testSessionId });
      createdReservationIds.push(firstResponse.body.data.reservation_id);

      expect(firstResponse.status).toBe(201);

      const duplicateResponse = await request(app)
        .post('/api/reservations')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ user_id: user.id, session_id: testSessionId });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.message).toContain('already has a reservation');
    });
  });

  describe('Capacity Enforcement', () => {
    it('should never exceed session capacity', async () => {
      for (let i = 0; i < CAPACITY + 2; i++) {
        const user = await makeTestUser(`capacity-${i}`);
        const res = await request(app)
          .post('/api/reservations')
          .set('Authorization', `Bearer ${user.token}`)
          .send({ user_id: user.id, session_id: testSessionId });
        if (res.body?.data?.reservation_id) createdReservationIds.push(res.body.data.reservation_id);
      }

      const { rows: countRows } = await pool.query(
        "SELECT COUNT(*)::int as count FROM reservations WHERE session_id = $1 AND status = 'approved'",
        [testSessionId]
      );
      expect(Number(countRows[0].count)).toBeLessThanOrEqual(CAPACITY);
    });
  });
});

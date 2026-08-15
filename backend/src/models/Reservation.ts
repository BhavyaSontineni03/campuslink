import pool from '../config/database';
import { Reservation, ReservationWithSession, ReservationResult } from '../types';

export class ReservationModel {
  // Request a reservation (atomic transaction with row locking)
  static async requestReservation(userId: number, sessionId: number): Promise<ReservationResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sessionRows = await client.query('SELECT capacity FROM sessions WHERE id = $1 FOR UPDATE', [sessionId]);
      if (sessionRows.rows.length === 0) {
        throw new Error('Session does not exist');
      }
      const capacity = sessionRows.rows[0].capacity;

      const existing = await client.query(
        `SELECT id FROM reservations WHERE user_id = $1 AND session_id = $2 AND status != 'cancelled'`,
        [userId, sessionId]
      );
      if (existing.rows.length > 0) {
        throw new Error('User already has a reservation for this session');
      }

      const approvedCount = await client.query(
        `SELECT COUNT(*)::int as count FROM reservations WHERE session_id = $1 AND status = 'approved'`,
        [sessionId]
      );
      const status = approvedCount.rows[0].count < capacity ? 'approved' : 'waitlisted';

      const inserted = await client.query(
        'INSERT INTO reservations (user_id, session_id, status) VALUES ($1, $2, $3) RETURNING id',
        [userId, sessionId, status]
      );

      await client.query('COMMIT');
      return { reservation_id: inserted.rows[0].id, status };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Cancel a reservation
  static async cancelReservation(reservationId: number, userId: number): Promise<boolean> {
    // First, get the session_id and check if it was an approved reservation
    const { rows: reservationRows } = await pool.query(
      'SELECT session_id, status FROM reservations WHERE id = $1 AND user_id = $2',
      [reservationId, userId]
    );

    if (reservationRows.length === 0) {
      return false;
    }

    const reservation = reservationRows[0];
    const wasApproved = reservation.status === 'approved';
    const sessionId = reservation.session_id;

    // Cancel the reservation
    const result = await pool.query(
      `UPDATE reservations SET status = 'cancelled' WHERE id = $1 AND user_id = $2`,
      [reservationId, userId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return false;
    }

    // If it was an approved reservation, promote from waitlist
    if (wasApproved) {
      await ReservationModel.promoteFromWaitlist(sessionId);
    }

    return true;
  }

  // Optimized waitlist promotion with database transaction, retry logic, and better performance
  private static async promoteFromWaitlist(sessionId: number): Promise<void> {
    const { PerformanceMonitor } = await import('../utils/performanceMonitor');
    const endTimer = PerformanceMonitor.startTimer('waitlist-promotion');

    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Single optimized query to get session info and check capacity
        const sessionResult = await client.query(`
          SELECT 
            s.capacity, 
            s.title, 
            s.start_time,
            COUNT(r_approved.id)::int as approved_count
          FROM sessions s
          LEFT JOIN reservations r_approved ON s.id = r_approved.session_id AND r_approved.status = 'approved'
          WHERE s.id = $1
          GROUP BY s.id, s.capacity, s.title, s.start_time
        `, [sessionId]);

        if (sessionResult.rows.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return;
        }

        const session = sessionResult.rows[0];
        const capacity = session.capacity;
        const approvedCount = session.approved_count;

        // If capacity available, promote earliest waitlisted
        if (approvedCount < capacity) {
          // Get the next person in waitlist with FOR UPDATE to prevent race conditions
          const waitlistedResult = await client.query(`
            SELECT id, user_id 
            FROM reservations 
            WHERE session_id = $1 AND status = 'waitlisted' 
            ORDER BY created_at ASC 
            LIMIT 1
            FOR UPDATE
          `, [sessionId]);

          if (waitlistedResult.rows.length > 0) {
            const waitlistedReservation = waitlistedResult.rows[0];
            const waitlistedId = waitlistedReservation.id;
            const userId = waitlistedReservation.user_id;

            // Update status to approved
            await client.query(
              `UPDATE reservations SET status = 'approved' WHERE id = $1`,
              [waitlistedId]
            );

            // Commit the transaction first to ensure data consistency
            await client.query('COMMIT');
            client.release();

            // Send notification asynchronously (don't block the promotion)
            setImmediate(async () => {
              try {
                const { NotificationService } = await import('../services/notificationService');
                await NotificationService.notifyWaitlistPromotion(
                  userId,
                  session.title,
                  session.start_time.toISOString()
                );
                console.log(`✅ Waitlist promotion notification sent to user ${userId} for session "${session.title}"`);
              } catch (notificationError) {
                console.error('❌ Error sending waitlist promotion notification:', notificationError);
                // Log but don't fail the promotion
              }
            });

            console.log(`🚀 Successfully promoted user ${userId} from waitlist for session "${session.title}"`);
            endTimer(); // End performance monitoring
            return; // Success, exit retry loop
          } else {
            await client.query('ROLLBACK');
            client.release();
            endTimer(); // End performance monitoring
            return; // No waitlisted users, exit retry loop
          }
        } else {
          await client.query('ROLLBACK');
          client.release();
          endTimer(); // End performance monitoring
          return; // No capacity available, exit retry loop
        }
      } catch (error) {
        await client.query('ROLLBACK');
        client.release();

        retryCount++;
        console.error(`❌ Error promoting from waitlist (attempt ${retryCount}/${maxRetries}):`, error);

        if (retryCount >= maxRetries) {
          console.error('❌ Max retries reached for waitlist promotion, giving up');
          endTimer(); // End performance monitoring
          return;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
      }
    }

    endTimer(); // End performance monitoring (fallback)
  }

  // Get waitlist position for a user's reservation
  static async getWaitlistPosition(reservationId: number, userId: number): Promise<number | null> {
    try {
      // First check if the reservation exists and belongs to the user
      const { rows: reservationRows } = await pool.query(
        'SELECT session_id, status FROM reservations WHERE id = $1 AND user_id = $2',
        [reservationId, userId]
      );

      if (reservationRows.length === 0) {
        return null;
      }

      const reservation = reservationRows[0];

      // If not waitlisted, return null
      if (reservation.status !== 'waitlisted') {
        return null;
      }

      // Count how many people are ahead in the waitlist
      const { rows: positionRows } = await pool.query(
        `SELECT COUNT(*)::int as position 
         FROM reservations 
         WHERE session_id = $1 
         AND status = 'waitlisted' 
         AND created_at < (SELECT created_at FROM reservations WHERE id = $2)`,
        [reservation.session_id, reservationId]
      );

      const position = positionRows[0].position;
      return position + 1; // Position is 1-indexed
    } catch (error) {
      console.error('Error getting waitlist position:', error);
      return null;
    }
  }

  // Get user's reservations
  static async findByUserId(userId: number): Promise<ReservationWithSession[]> {
    const { rows } = await pool.query(`
      SELECT 
        r.*,
        s.title,
        s.start_time,
        s.end_time,
        s.location,
        s.capacity,
        (SELECT COUNT(*)::int FROM reservations WHERE session_id = s.id AND status = 'approved') as approved_count
      FROM reservations r
      JOIN sessions s ON r.session_id = s.id
      WHERE r.user_id = $1
      ORDER BY s.start_time ASC
    `, [userId]);
    return rows as ReservationWithSession[];
  }

  // Get reservation by ID
  static async findById(id: number): Promise<Reservation | null> {
    const { rows } = await pool.query(
      'SELECT * FROM reservations WHERE id = $1',
      [id]
    );
    const reservations = rows as Reservation[];
    return reservations.length > 0 ? reservations[0] : null;
  }

  // Get reservation with session details
  static async findByIdWithSession(id: number): Promise<ReservationWithSession | null> {
    const { rows } = await pool.query(`
      SELECT 
        r.*,
        s.title,
        s.start_time,
        s.end_time,
        s.location,
        s.capacity,
        (SELECT COUNT(*)::int FROM reservations WHERE session_id = s.id AND status = 'approved') as approved_count
      FROM reservations r
      JOIN sessions s ON r.session_id = s.id
      WHERE r.id = $1
    `, [id]);
    const reservations = rows as ReservationWithSession[];
    return reservations.length > 0 ? reservations[0] : null;
  }

  // Get reservations by status
  static async findByUserIdAndStatus(userId: number, status: string): Promise<ReservationWithSession[]> {
    const { rows } = await pool.query(`
      SELECT 
        r.*,
        s.title,
        s.start_time,
        s.end_time,
        s.location,
        s.capacity,
        (SELECT COUNT(*)::int FROM reservations WHERE session_id = s.id AND status = 'approved') as approved_count
      FROM reservations r
      JOIN sessions s ON r.session_id = s.id
      WHERE r.user_id = $1 AND r.status = $2
      ORDER BY s.start_time ASC
    `, [userId, status]);
    return rows as ReservationWithSession[];
  }


  // Get session's waitlist
  static async getSessionWaitlist(sessionId: number): Promise<Reservation[]> {
    const { rows } = await pool.query(`
      SELECT r.*, u.name, u.email
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      WHERE r.session_id = $1 AND r.status = 'waitlisted'
      ORDER BY r.created_at ASC
    `, [sessionId]);
    return rows as Reservation[];
  }

  // Check if user can check in (reservation must be approved)
  static async canCheckIn(reservationId: number, userId: number): Promise<boolean> {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int as count
      FROM reservations
      WHERE id = $1 AND user_id = $2 AND status = 'approved'
    `, [reservationId, userId]);

    return rows[0].count > 0;
  }

  // Get user's attendance history
  static async getAttendanceHistory(userId: number): Promise<any[]> {
    const { rows } = await pool.query(`
      SELECT 
        r.id as reservation_id,
        s.title,
        s.start_time,
        a.checkin_time,
        a.checkout_time,
        CASE 
          WHEN a.checkout_time IS NOT NULL THEN 'completed'
          WHEN a.checkin_time IS NOT NULL THEN 'checked_in'
          ELSE 'not_checked_in'
        END as attendance_status
      FROM reservations r
      JOIN sessions s ON r.session_id = s.id
      LEFT JOIN attendance a ON r.id = a.reservation_id
      WHERE r.user_id = $1 AND r.status = 'approved'
      ORDER BY s.start_time DESC
    `, [userId]);
    return rows as any[];
  }

  // Admin methods
  static async count(): Promise<number> {
    const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM reservations');
    return rows[0].count;
  }

  static async findAllWithAdminDetails(filters: {
    status?: string;
    sessionId?: number;
    limit: number;
    offset: number;
  }): Promise<any[]> {
    let query = `
      SELECT 
        r.*,
        u.name as user_name,
        u.email as user_email,
        s.title as session_title,
        s.start_time as session_start_time,
        s.location as session_location
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      JOIN sessions s ON r.session_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND r.status = $${params.length}`;
    }

    if (filters.sessionId) {
      params.push(filters.sessionId);
      query += ` AND r.session_id = $${params.length}`;
    }

    query += `
      ORDER BY r.created_at DESC
      LIMIT ${filters.limit} OFFSET ${filters.offset}
    `;

    const { rows } = await pool.query(query, params);
    return rows as any[];
  }

  static async countWithFilters(filters: {
    status?: string;
    sessionId?: number;
  }): Promise<number> {
    let query = 'SELECT COUNT(*)::int as count FROM reservations WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    if (filters.sessionId) {
      params.push(filters.sessionId);
      query += ` AND session_id = $${params.length}`;
    }

    const { rows } = await pool.query(query, params);
    return rows[0].count;
  }

  static async updateStatus(reservationId: number, status: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE reservations SET status = $1 WHERE id = $2',
      [status, reservationId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Get session details for notifications
  static async getSessionDetails(sessionId: number): Promise<{ title: string; start_time: string } | null> {
    const { rows } = await pool.query(
      'SELECT title, start_time FROM sessions WHERE id = $1',
      [sessionId]
    );
    return rows.length > 0 ? rows[0] : null;
  }
}

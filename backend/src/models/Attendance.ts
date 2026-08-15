import pool from '../config/database';
import { Attendance } from '../types';

export class AttendanceModel {
  // Check in to a session
  static async checkIn(reservationId: number): Promise<Attendance> {
    // First check if attendance record exists
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM attendance WHERE reservation_id = $1',
      [reservationId]
    );

    if (existingRows.length > 0) {
      // Update existing record
      await pool.query(
        'UPDATE attendance SET checkin_time = NOW() WHERE reservation_id = $1',
        [reservationId]
      );
    } else {
      // Create new record
      await pool.query(
        'INSERT INTO attendance (reservation_id, checkin_time) VALUES ($1, NOW())',
        [reservationId]
      );
    }

    // Return the attendance record
    const { rows } = await pool.query(
      'SELECT * FROM attendance WHERE reservation_id = $1',
      [reservationId]
    );
    const attendances = rows as Attendance[];
    return attendances[0];
  }

  // Check out of a session
  static async checkOut(reservationId: number): Promise<Attendance> {
    await pool.query(
      'UPDATE attendance SET checkout_time = NOW() WHERE reservation_id = $1',
      [reservationId]
    );

    // Return the updated record
    const { rows } = await pool.query(
      'SELECT * FROM attendance WHERE reservation_id = $1',
      [reservationId]
    );
    const attendances = rows as Attendance[];
    return attendances[0];
  }

  // Get attendance record by reservation ID
  static async findByReservationId(reservationId: number): Promise<Attendance | null> {
    const { rows } = await pool.query(
      'SELECT * FROM attendance WHERE reservation_id = $1',
      [reservationId]
    );
    const attendances = rows as Attendance[];
    return attendances.length > 0 ? attendances[0] : null;
  }

  // Get user's attendance statistics
  static async getUserStats(userId: number): Promise<any> {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*)::int as total_checkins,
        COUNT(CASE WHEN checkout_time IS NOT NULL THEN 1 END)::int as completed_sessions,
        COUNT(CASE WHEN checkout_time IS NULL AND checkin_time IS NOT NULL THEN 1 END)::int as currently_attending,
        MAX(checkin_time) as last_checkin
      FROM attendance a
      JOIN reservations r ON a.reservation_id = r.id
      WHERE r.user_id = $1
    `, [userId]);

    return rows[0];
  }

  // Get current streak (consecutive days with check-ins)
  static async getCurrentStreak(userId: number): Promise<number> {
    const { rows } = await pool.query(`
      WITH daily_checkins AS (
        SELECT DISTINCT DATE(checkin_time) as checkin_date
        FROM attendance a
        JOIN reservations r ON a.reservation_id = r.id
        WHERE r.user_id = $1 AND a.checkin_time IS NOT NULL
        ORDER BY checkin_date DESC
      ),
      streak_groups AS (
        SELECT 
          checkin_date,
          ROW_NUMBER() OVER (ORDER BY checkin_date DESC) as row_num,
          checkin_date - (ROW_NUMBER() OVER (ORDER BY checkin_date DESC)) * INTERVAL '1 day' as group_date
        FROM daily_checkins
      )
      SELECT COUNT(*)::int as current_streak
      FROM streak_groups
      WHERE group_date = (
        SELECT group_date FROM streak_groups WHERE row_num = 1
      )
    `, [userId]);

    const result = rows[0];
    return result.current_streak || 0;
  }

  // Get longest streak
  static async getLongestStreak(userId: number): Promise<number> {
    const { rows } = await pool.query(`
      WITH daily_checkins AS (
        SELECT DISTINCT DATE(checkin_time) as checkin_date
        FROM attendance a
        JOIN reservations r ON a.reservation_id = r.id
        WHERE r.user_id = $1 AND a.checkin_time IS NOT NULL
        ORDER BY checkin_date
      ),
      streak_groups AS (
        SELECT 
          checkin_date,
          ROW_NUMBER() OVER (ORDER BY checkin_date) as row_num,
          checkin_date - (ROW_NUMBER() OVER (ORDER BY checkin_date)) * INTERVAL '1 day' as group_date
        FROM daily_checkins
      ),
      streak_lengths AS (
        SELECT group_date, COUNT(*)::int as streak_length
        FROM streak_groups
        GROUP BY group_date
      )
      SELECT MAX(streak_length) as longest_streak
      FROM streak_lengths
    `, [userId]);

    const result = rows[0];
    return result.longest_streak || 0;
  }

  // Get attendance for a specific session
  static async getSessionAttendance(sessionId: number): Promise<any[]> {
    const { rows } = await pool.query(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        a.checkin_time,
        a.checkout_time,
        CASE 
          WHEN a.checkout_time IS NOT NULL THEN 'completed'
          WHEN a.checkin_time IS NOT NULL THEN 'checked_in'
          ELSE 'not_checked_in'
        END as status
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN attendance a ON r.id = a.reservation_id
      WHERE r.session_id = $1 AND r.status = 'approved'
      ORDER BY a.checkin_time ASC
    `, [sessionId]);

    return rows as any[];
  }

  // Get recent attendance activity
  static async getRecentActivity(limit: number = 10): Promise<any[]> {
    const { rows } = await pool.query(`
      SELECT 
        u.name,
        s.title,
        a.checkin_time,
        a.checkout_time,
        CASE 
          WHEN a.checkout_time IS NOT NULL THEN 'completed'
          WHEN a.checkin_time IS NOT NULL THEN 'checked_in'
        END as action
      FROM attendance a
      JOIN reservations r ON a.reservation_id = r.id
      JOIN users u ON r.user_id = u.id
      JOIN sessions s ON r.session_id = s.id
      WHERE a.checkin_time IS NOT NULL
      ORDER BY a.checkin_time DESC
      LIMIT ${limit}
    `);

    return rows as any[];
  }

  // Admin methods
  static async getRecentActivityCount(): Promise<number> {
    const { rows } = await pool.query(`
      SELECT COUNT(*)::int as count
      FROM attendance a
      WHERE a.checkin_time >= NOW() - INTERVAL '7 days'
    `);
    return rows[0].count;
  }
}

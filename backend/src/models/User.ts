import pool from '../config/database';
import { User, UserWithStats } from '../types';

export class UserModel {
  // Get user by ID
  static async findById(id: number): Promise<User | null> {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    const users = rows as User[];
    return users.length > 0 ? users[0] : null;
  }

  // Get user by email
  static async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    const users = rows as User[];
    return users.length > 0 ? users[0] : null;
  }

  // Create new user
  static async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const { email, name, avatar_url, role, password_hash, is_active } = userData;
    const { rows } = await pool.query(
      'INSERT INTO users (email, name, avatar_url, role, password_hash, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [email, name, avatar_url || null, role || 'student', password_hash || null, is_active !== undefined ? is_active : true]
    );
    const user = await this.findById(rows[0].id);
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  // Get user with statistics
  static async findByIdWithStats(id: number): Promise<UserWithStats | null> {
    const user = await this.findById(id);
    if (!user) return null;

    // Get total reservations
    const { rows: reservationRows } = await pool.query(
      'SELECT COUNT(*)::int as total FROM reservations WHERE user_id = $1',
      [id]
    );
    const totalReservations = reservationRows[0].total;

    // Get current streak
    const { rows: streakRows } = await pool.query(`
      SELECT COUNT(*)::int as current_streak
      FROM attendance a
      JOIN reservations r ON a.reservation_id = r.id
      WHERE r.user_id = $1 AND a.checkin_time IS NOT NULL
      AND a.checkin_time >= NOW() - INTERVAL '7 days'
    `, [id]);
    const currentStreak = streakRows[0].current_streak;

    return {
      ...user,
      total_reservations: totalReservations,
      current_streak: currentStreak
    };
  }

  // Get user's friends
  static async getFriends(userId: number): Promise<User[]> {
    const { rows } = await pool.query(`
      SELECT u.* FROM users u
      JOIN follows f ON u.id = f.target_user_id
      WHERE f.user_id = $1
      ORDER BY u.name
    `, [userId]);
    return rows as User[];
  }

  // Follow a user
  static async followUser(userId: number, targetUserId: number): Promise<boolean> {
    try {
      await pool.query(
        'INSERT INTO follows (user_id, target_user_id) VALUES ($1, $2)',
        [userId, targetUserId]
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  // Unfollow a user
  static async unfollowUser(userId: number, targetUserId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM follows WHERE user_id = $1 AND target_user_id = $2',
      [userId, targetUserId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Get friends attending a specific session
  static async getFriendsAttendingSession(userId: number, sessionId: number): Promise<User[]> {
    const { rows } = await pool.query(`
      SELECT DISTINCT u.* FROM users u
      JOIN follows f ON u.id = f.target_user_id
      JOIN reservations r ON u.id = r.user_id
      WHERE f.user_id = $1 AND r.session_id = $2 AND r.status = 'approved'
      ORDER BY u.name
    `, [userId, sessionId]);
    return rows as User[];
  }

  // Admin methods
  static async count(): Promise<number> {
    const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM users');
    return rows[0].count;
  }

  static async findAllWithFilters(filters: {
    role?: string;
    search?: string;
    limit: number;
    offset: number;
  }): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];

    if (filters.role) {
      params.push(filters.role);
      query += ` AND role = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`, `%${filters.search}%`);
      query += ` AND (name LIKE $${params.length - 1} OR email LIKE $${params.length})`;
    }

    query += ` ORDER BY created_at DESC LIMIT ${filters.limit} OFFSET ${filters.offset}`;

    const { rows } = await pool.query(query, params);
    return rows as User[];
  }

  static async countWithFilters(filters: {
    role?: string;
    search?: string;
  }): Promise<number> {
    let query = 'SELECT COUNT(*)::int as count FROM users WHERE 1=1';
    const params: any[] = [];

    if (filters.role) {
      params.push(filters.role);
      query += ` AND role = $${params.length}`;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`, `%${filters.search}%`);
      query += ` AND (name LIKE $${params.length - 1} OR email LIKE $${params.length})`;
    }

    const { rows } = await pool.query(query, params);
    return rows[0].count;
  }

  static async updateRole(userId: number, role: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async updateStatus(userId: number, isActive: boolean): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2',
      [isActive, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  static async updatePassword(userId: number, passwordHash: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Update user profile (name, email)
  static async updateProfile(userId: number, profileData: { name?: string; email?: string }): Promise<boolean> {
    const { name, email } = profileData;
    const updates: string[] = [];
    const values: any[] = [];

    if (name) {
      values.push(name);
      updates.push(`name = $${values.length}`);
    }

    if (email) {
      values.push(email);
      updates.push(`email = $${values.length}`);
    }

    if (updates.length === 0) {
      return false;
    }

    values.push(userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`;

    const result = await pool.query(query, values);
    return (result.rowCount ?? 0) > 0;
  }

  // Delete user with proper cascading
  static async delete(userId: number): Promise<boolean> {
    const client = await pool.connect();
    try {
      console.log(`Attempting to delete user ${userId}`);

      await client.query('BEGIN');
      console.log('Transaction started');

      // 1. Delete attendance records (via reservations)
      await client.query(`
        DELETE FROM attendance a USING reservations r
        WHERE a.reservation_id = r.id AND r.user_id = $1
      `, [userId]);
      console.log('Deleted attendance records');

      // 2. Delete reservations
      await client.query('DELETE FROM reservations WHERE user_id = $1', [userId]);
      console.log('Deleted reservations');

      // 3. Delete follows relationships (both directions)
      await client.query('DELETE FROM follows WHERE user_id = $1 OR target_user_id = $1', [userId]);
      console.log('Deleted follows relationships');

      // 4. Handle sessions created by this user
      // First, delete attendance for sessions created by this user
      await client.query(`
        DELETE FROM attendance a USING reservations r, sessions s
        WHERE a.reservation_id = r.id AND r.session_id = s.id AND s.created_by = $1
      `, [userId]);
      console.log('Deleted attendance for sessions created by user');

      // Delete reservations for sessions created by this user
      await client.query(`
        DELETE FROM reservations r USING sessions s
        WHERE r.session_id = s.id AND s.created_by = $1
      `, [userId]);
      console.log('Deleted reservations for sessions created by user');

      // Delete sessions created by this user
      await client.query('DELETE FROM sessions WHERE created_by = $1', [userId]);
      console.log('Deleted sessions created by user');

      // 5. Delete admin audit log entries (target_user_id will be set to NULL due to ON DELETE SET NULL)
      // This is handled by the foreign key constraint

      // 6. Finally, delete the user
      const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log('Deleted user result:', result.rowCount);

      await client.query('COMMIT');
      console.log('Transaction committed successfully');

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('Transaction rolled back due to error');
      console.error('Error deleting user:', error);
      return false;
    } finally {
      client.release();
    }
  }
}

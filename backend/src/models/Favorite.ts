import pool from '../config/database';

export interface Favorite {
  id: number;
  user_id: number;
  session_id: number;
  created_at: string;
}

export class FavoriteModel {
  // Add a session to favorites
  static async addToFavorites(userId: number, sessionId: number): Promise<Favorite> {
    const { rows } = await pool.query(
      'INSERT INTO favorites (user_id, session_id) VALUES ($1, $2) RETURNING id',
      [userId, sessionId]
    );
    return this.getById(rows[0].id);
  }

  // Remove a session from favorites
  static async removeFromFavorites(userId: number, sessionId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND session_id = $2',
      [userId, sessionId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Check if a session is favorited by a user
  static async isFavorited(userId: number, sessionId: number): Promise<boolean> {
    const { rows } = await pool.query(
      'SELECT id FROM favorites WHERE user_id = $1 AND session_id = $2',
      [userId, sessionId]
    );
    return rows.length > 0;
  }

  // Get all favorites for a user with session details
  static async getByUserId(userId: number): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT f.*, s.*, 
              (SELECT COUNT(*)::int FROM reservations WHERE session_id = s.id AND status = 'approved') as approved_count,
              (SELECT COUNT(*)::int FROM reservations WHERE session_id = s.id AND status = 'waitlisted') as waitlisted_count,
              (s.capacity - (SELECT COUNT(*)::int FROM reservations WHERE session_id = s.id AND status = 'approved')) as remaining_seats,
              (SELECT COUNT(*)::int FROM reservations r 
               JOIN follows fl ON fl.target_user_id = r.user_id 
               WHERE r.session_id = s.id AND r.status = 'approved' AND fl.user_id = $1) as friends_attending_count
       FROM favorites f 
       JOIN sessions s ON f.session_id = s.id 
       WHERE f.user_id = $2 
       ORDER BY f.created_at DESC`,
      [userId, userId]
    );
    return rows as any[];
  }

  // Get favorite by ID
  static async getById(id: number): Promise<Favorite> {
    const { rows } = await pool.query(
      'SELECT * FROM favorites WHERE id = $1',
      [id]
    );
    return rows[0];
  }

  // Get favorite count for a session
  static async getFavoriteCount(sessionId: number): Promise<number> {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int as count FROM favorites WHERE session_id = $1',
      [sessionId]
    );
    return rows[0].count;
  }
}

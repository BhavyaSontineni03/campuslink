import pool from '../config/database';
import { Session, SessionWithCapacity, SessionWithFriends } from '../types';

export class SessionModel {
  // Get all sessions with capacity information
  static async findAllWithCapacity(userId?: number): Promise<SessionWithCapacity[]> {
    let query = `
      SELECT 
        s.*,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'waitlisted' THEN 1 END) as waitlisted_count,
        (s.capacity - COUNT(CASE WHEN r.status = 'approved' THEN 1 END)) as remaining_seats`;
    
    if (userId) {
      query += `,
        COUNT(CASE WHEN f.user_id = $1 AND r.status = 'approved' THEN 1 END) as friends_attending_count`;
    }
    
    query += `
      FROM sessions s
      LEFT JOIN reservations r ON s.id = r.session_id`;
    
    if (userId) {
      query += `
      LEFT JOIN follows f ON f.target_user_id = r.user_id AND f.user_id = $2`;
    }
    
    query += `
      WHERE s.start_time > NOW() OR (s.start_time <= NOW() AND s.end_time > NOW())
      GROUP BY s.id
      ORDER BY s.start_time ASC
    `;
    
    const params = userId ? [userId, userId] : [];
    const { rows } = await pool.query(query, params);
    return rows as SessionWithCapacity[];
  }

  // Get session by ID with capacity
  static async findByIdWithCapacity(id: number, userId?: number): Promise<SessionWithCapacity | null> {
    let query = `
      SELECT 
        s.*,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'waitlisted' THEN 1 END) as waitlisted_count,
        (s.capacity - COUNT(CASE WHEN r.status = 'approved' THEN 1 END)) as remaining_seats`;
    
    if (userId) {
      query += `,
        COUNT(CASE WHEN f.user_id = $1 AND r.status = 'approved' THEN 1 END) as friends_attending_count`;
    }
    
    query += `
      FROM sessions s
      LEFT JOIN reservations r ON s.id = r.session_id`;
    
    if (userId) {
      query += `
      LEFT JOIN follows f ON f.target_user_id = r.user_id AND f.user_id = $2`;
    }
    
    query += `
      WHERE s.id = $${userId ? 3 : 1}
      GROUP BY s.id
    `;
    
    const params = userId ? [userId, userId, id] : [id];
    const { rows } = await pool.query(query, params);
    const sessions = rows as SessionWithCapacity[];
    return sessions.length > 0 ? sessions[0] : null;
  }

  // Get session with friends attending
  static async findByIdWithFriends(userId: number, sessionId: number): Promise<SessionWithFriends | null> {
    const session = await this.findByIdWithCapacity(sessionId);
    if (!session) return null;

    // Get friends attending this session
    const { rows: friendRows } = await pool.query(`
      SELECT DISTINCT u.* FROM users u
      JOIN follows f ON u.id = f.target_user_id
      JOIN reservations r ON u.id = r.user_id
      WHERE f.user_id = $1 AND r.session_id = $2 AND r.status = 'approved'
      ORDER BY u.name
    `, [userId, sessionId]);
    const friendsAttending = friendRows as any[];

    return {
      ...session,
      friends_attending: friendsAttending
    };
  }

  // Get sessions by category
  static async findByCategory(category: string, userId?: number): Promise<SessionWithCapacity[]> {
    let query = `
      SELECT 
        s.*,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'waitlisted' THEN 1 END) as waitlisted_count,
        (s.capacity - COUNT(CASE WHEN r.status = 'approved' THEN 1 END)) as remaining_seats`;
    
    if (userId) {
      query += `,
        COUNT(CASE WHEN f.user_id = $1 AND r.status = 'approved' THEN 1 END) as friends_attending_count`;
    }
    
    query += `
      FROM sessions s
      LEFT JOIN reservations r ON s.id = r.session_id`;
    
    if (userId) {
      query += `
      LEFT JOIN follows f ON f.target_user_id = r.user_id AND f.user_id = $2`;
    }
    
    query += `
      WHERE s.category = $${userId ? 3 : 1} AND s.start_time > NOW()
      GROUP BY s.id
      ORDER BY s.start_time ASC
    `;
    
    const params = userId ? [userId, userId, category] : [category];
    const { rows } = await pool.query(query, params);
    return rows as SessionWithCapacity[];
  }

  // Get sessions by date range
  static async findByDateRange(startDate: string, endDate: string, userId?: number): Promise<SessionWithCapacity[]> {
    let query = `
      SELECT 
        s.*,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'waitlisted' THEN 1 END) as waitlisted_count,
        (s.capacity - COUNT(CASE WHEN r.status = 'approved' THEN 1 END)) as remaining_seats`;
    
    if (userId) {
      query += `,
        COUNT(CASE WHEN f.user_id = $1 AND r.status = 'approved' THEN 1 END) as friends_attending_count`;
    }
    
    query += `
      FROM sessions s
      LEFT JOIN reservations r ON s.id = r.session_id`;
    
    if (userId) {
      query += `
      LEFT JOIN follows f ON f.target_user_id = r.user_id AND f.user_id = $2`;
    }
    
    query += `
      WHERE s.start_time >= $${userId ? 3 : 1} AND s.start_time <= $${userId ? 4 : 2}
      GROUP BY s.id
      ORDER BY s.start_time ASC
    `;
    
    const params = userId ? [userId, userId, startDate, endDate] : [startDate, endDate];
    const { rows } = await pool.query(query, params);
    return rows as SessionWithCapacity[];
  }

  // Create new session
  static async create(sessionData: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session> {
    const { title, description, category, start_time, end_time, capacity, location, created_by, tags } = sessionData;
    const { rows } = await pool.query(
      `INSERT INTO sessions (title, description, category, start_time, end_time, capacity, location, created_by, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, category, start_time, end_time, capacity, location, created_by, tags || []]
    );
    return rows[0] as Session;
  }

  // Get popular sessions (by reservation count)
  static async getPopularSessions(limit: number = 10, userId?: number): Promise<SessionWithCapacity[]> {
    let query = `
      SELECT 
        s.*,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'waitlisted' THEN 1 END) as waitlisted_count,
        (s.capacity - COUNT(CASE WHEN r.status = 'approved' THEN 1 END)) as remaining_seats`;
    
    if (userId) {
      query += `,
        COUNT(CASE WHEN f.user_id = $1 AND r.status = 'approved' THEN 1 END) as friends_attending_count`;
    }
    
    query += `
      FROM sessions s
      LEFT JOIN reservations r ON s.id = r.session_id`;
    
    if (userId) {
      query += `
      LEFT JOIN follows f ON f.target_user_id = r.user_id AND f.user_id = $2`;
    }
    
    query += `
      WHERE s.start_time > NOW() OR (s.start_time <= NOW() AND s.end_time > NOW())
      GROUP BY s.id
      ORDER BY approved_count DESC, waitlisted_count DESC
      LIMIT ${limit}
    `;
    
    const params = userId ? [userId, userId] : [];
    const { rows } = await pool.query(query, params);
    return rows as SessionWithCapacity[];
  }

  // Get session utilization statistics
  static async getUtilizationStats(): Promise<any[]> {
    const { rows } = await pool.query(`
      SELECT 
        s.id,
        s.title,
        s.capacity,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        CASE 
          WHEN s.capacity = 0 OR s.capacity IS NULL THEN 0
          ELSE ROUND((COUNT(CASE WHEN r.status = 'approved' THEN 1 END)::numeric / s.capacity) * 100, 2)
        END as utilization_percentage
      FROM sessions s
      LEFT JOIN reservations r ON s.id = r.session_id
      WHERE s.start_time > NOW()
      GROUP BY s.id, s.title, s.capacity
      ORDER BY utilization_percentage DESC
    `);
    return rows as any[];
  }

  // Admin methods
  static async count(): Promise<number> {
    const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM sessions');
    return rows[0].count;
  }

  static async countActive(): Promise<number> {
    const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM sessions WHERE start_time > NOW()');
    return rows[0].count;
  }

  static async findAllWithAdminDetails(filters: {
    category?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<any[]> {
    let query = `
      SELECT 
        s.*,
        u.name as creator_name,
        u.email as creator_email,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'waitlisted' THEN 1 END) as waitlisted_count,
        COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) as cancelled_count,
        (s.capacity - COUNT(CASE WHEN r.status = 'approved' THEN 1 END)) as remaining_seats
      FROM sessions s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN reservations r ON s.id = r.session_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.category) {
      params.push(filters.category);
      query += ` AND s.category = $${params.length}`;
    }

    if (filters.status) {
      if (filters.status === 'upcoming') {
        query += ' AND s.start_time > NOW()';
      } else if (filters.status === 'past') {
        query += ' AND s.start_time <= NOW()';
      }
    }

    query += `
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ${filters.limit} OFFSET ${filters.offset}
    `;

    const { rows } = await pool.query(query, params);
    return rows as any[];
  }

  static async countWithFilters(filters: {
    category?: string;
    status?: string;
  }): Promise<number> {
    let query = 'SELECT COUNT(*)::int as count FROM sessions WHERE 1=1';
    const params: any[] = [];

    if (filters.category) {
      params.push(filters.category);
      query += ` AND category = $${params.length}`;
    }

    if (filters.status) {
      if (filters.status === 'upcoming') {
        query += ' AND start_time > NOW()';
      } else if (filters.status === 'past') {
        query += ' AND start_time <= NOW()';
      }
    }

    const { rows } = await pool.query(query, params);
    return rows[0].count;
  }

  static async delete(sessionId: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Find session by ID (basic)
  static async findById(id: number): Promise<Session | null> {
    const { rows } = await pool.query('SELECT * FROM sessions WHERE id = $1', [id]);
    const sessions = rows as Session[];
    return sessions.length > 0 ? sessions[0] : null;
  }

  // Find sessions by organizer
  static async findByOrganizer(organizerId: number): Promise<SessionWithCapacity[]> {
    const query = `
      SELECT 
        s.*,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN r.status = 'waitlisted' THEN 1 END) as waitlisted_count,
        (s.capacity - COUNT(CASE WHEN r.status = 'approved' THEN 1 END)) as remaining_seats
      FROM sessions s
      LEFT JOIN reservations r ON s.id = r.session_id
      WHERE s.created_by = $1
      GROUP BY s.id
      ORDER BY s.start_time ASC
    `;
    
    const { rows } = await pool.query(query, [organizerId]);
    return rows as SessionWithCapacity[];
  }

  // Update session
  static async update(id: number, sessionData: Partial<Omit<Session, 'id' | 'created_at' | 'updated_at' | 'created_by'>>): Promise<Session> {
    const { title, description, category, start_time, end_time, capacity, location, tags } = sessionData;

    const { rows } = await pool.query(
      `UPDATE sessions
       SET title = $1, description = $2, category = $3, start_time = $4, end_time = $5,
           capacity = $6, location = $7, tags = COALESCE($8, tags), updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [title, description, category, start_time, end_time, capacity, location, tags ?? null, id]
    );

    return rows[0] as Session;
  }

  static async getSystemAnalytics(days: number = 30): Promise<any> {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT r.user_id) as unique_participants,
        COUNT(r.id) as total_reservations,
        COUNT(CASE WHEN r.status = 'approved' THEN 1 END) as approved_reservations,
        COUNT(CASE WHEN r.status = 'waitlisted' THEN 1 END) as waitlisted_reservations,
        COUNT(CASE WHEN a.checkin_time IS NOT NULL THEN 1 END) as total_checkins,
        AVG(CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END) as approval_rate
      FROM sessions s
      LEFT JOIN reservations r ON s.id = r.session_id
      LEFT JOIN attendance a ON r.id = a.reservation_id
      WHERE s.created_at >= NOW() - make_interval(days => $1)
    `, [days]);
    
    return rows[0];
  }
}

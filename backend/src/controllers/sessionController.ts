import { Request, Response } from 'express';
import { SessionModel } from '../models/Session';
import { UserModel } from '../models/User';
import { NotificationService } from '../services/notificationService';
import { pool } from '../config/database';

function normalizeTags(input: unknown): string[] | undefined {
  if (input === undefined || input === null) return undefined;
  if (Array.isArray(input)) {
    return input.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  return undefined;
}

export class SessionController {
  // Get all sessions with capacity information
  static async getAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const { category, from, to } = req.query;
      const userId = (req as any).userId as number | undefined;
      
      let sessions;
      if (category) {
        sessions = await SessionModel.findByCategory(category as string, userId);
      } else if (from && to) {
        sessions = await SessionModel.findByDateRange(from as string, to as string, userId);
      } else {
        sessions = await SessionModel.findAllWithCapacity(userId);
      }
      
      res.json({
        success: true,
        data: sessions,
        count: sessions.length
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sessions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get session by ID with friends attending
  static async getSessionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      if (!userId) {
        // Return session without friends if no userId provided
        const sessionData = await SessionModel.findByIdWithCapacity(parseInt(id));
        if (!sessionData) {
          res.status(404).json({
            success: false,
            error: 'Session not found'
          });
          return;
        }
        
        res.json({
          success: true,
          data: sessionData
        });
        return;
      }
      
      // Get session with friends count
      const sessionData = await SessionModel.findByIdWithCapacity(parseInt(id), userId);
      if (!sessionData) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: sessionData
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Create new session (admin function)
  static async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, category, start_time, end_time, capacity, location, created_by, tags } = req.body;
      
      // Validate required fields
      if (!title || !category || !start_time || !end_time || !capacity || !created_by) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Title, category, start_time, end_time, capacity, and created_by are required'
        });
        return;
      }
      
      // Validate capacity
      if (capacity <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid capacity',
          message: 'Capacity must be greater than 0'
        });
        return;
      }
      
      // Validate time
      const startTime = new Date(start_time);
      const endTime = new Date(end_time);
      if (startTime >= endTime) {
        res.status(400).json({
          success: false,
          error: 'Invalid time range',
          message: 'Start time must be before end time'
        });
        return;
      }
      
      const session = await SessionModel.create({
        title,
        description,
        category,
        start_time: startTime,
        end_time: endTime,
        capacity,
        location,
        created_by,
        tags: normalizeTags(tags) || [],
      });

      // Notify all users about the new session
      try {
        await NotificationService.notifyNewSession(title, start_time);
      } catch (notificationError) {
        console.error('Error creating new session notifications:', notificationError);
        // Don't fail the session creation if notification fails
      }
      
      res.status(201).json({
        success: true,
        data: session,
        message: 'Session created successfully'
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get popular sessions
  static async getPopularSessions(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const userId = (req as any).userId as number | undefined;
      const sessions = await SessionModel.getPopularSessions(limit, userId);
      
      res.json({
        success: true,
        data: sessions,
        count: sessions.length
      });
    } catch (error) {
      console.error('Error fetching popular sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch popular sessions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get session utilization statistics
  static async getUtilizationStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await SessionModel.getUtilizationStats();
      
      res.json({
        success: true,
        data: stats,
        count: stats.length
      });
    } catch (error) {
      console.error('Error fetching utilization stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch utilization statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get session categories
  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const { rows } = await pool.query(`
        SELECT DISTINCT category, COUNT(*)::int as session_count
        FROM sessions
        WHERE start_time > NOW()
        GROUP BY category
        ORDER BY session_count DESC
      `);
      
      res.json({
        success: true,
        data: rows,
        count: rows.length
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Organizer CRUD operations
  // Get organizer's sessions
  static async getOrganizerSessions(req: Request, res: Response): Promise<void> {
    try {
      const organizerId = (req as any).userId as number | null;

      if (!organizerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please sign in to access this resource'
        });
        return;
      }

      const sessions = await SessionModel.findByOrganizer(organizerId);
      
      res.json({
        success: true,
        data: sessions,
        count: sessions.length
      });
    } catch (error) {
      console.error('Error fetching organizer sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch organizer sessions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update session (organizer only)
  static async updateSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const organizerId = (req as any).userId as number | null;
      const { title, description, category, start_time, end_time, capacity, location, tags } = req.body;

      if (!organizerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please sign in to access this resource'
        });
        return;
      }

      // Check if session exists and belongs to organizer
      const existingSession = await SessionModel.findById(parseInt(id));
      if (!existingSession) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      if (existingSession.created_by !== organizerId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only update your own sessions'
        });
        return;
      }

      // Validate required fields
      if (!title || !category || !start_time || !end_time || !capacity) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Title, category, start_time, end_time, and capacity are required'
        });
        return;
      }

      // Validate capacity
      if (capacity <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid capacity',
          message: 'Capacity must be greater than 0'
        });
        return;
      }

      // Validate time
      const startTime = new Date(start_time);
      const endTime = new Date(end_time);
      if (startTime >= endTime) {
        res.status(400).json({
          success: false,
          error: 'Invalid time range',
          message: 'Start time must be before end time'
        });
        return;
      }

      const updatedSession = await SessionModel.update(parseInt(id), {
        title,
        description,
        category,
        start_time: startTime,
        end_time: endTime,
        capacity,
        location,
        tags: normalizeTags(tags),
      });

      res.json({
        success: true,
        data: updatedSession,
        message: 'Session updated successfully'
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update session (public - any authenticated user)
  static async updateSessionPublic(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId as number | null;
      const { title, description, category, start_time, end_time, capacity, location, tags } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please sign in to access this resource'
        });
        return;
      }

      // Check if session exists
      const existingSession = await SessionModel.findById(parseInt(id));
      if (!existingSession) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      // Validate required fields
      if (!title || !category || !start_time || !end_time || !capacity) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Title, category, start_time, end_time, and capacity are required'
        });
        return;
      }

      // Validate capacity
      if (capacity <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid capacity',
          message: 'Capacity must be greater than 0'
        });
        return;
      }

      // Validate time
      const startTime = new Date(start_time);
      const endTime = new Date(end_time);
      if (startTime >= endTime) {
        res.status(400).json({
          success: false,
          error: 'Invalid time range',
          message: 'Start time must be before end time'
        });
        return;
      }

      const updatedSession = await SessionModel.update(parseInt(id), {
        title,
        description,
        category,
        start_time: startTime,
        end_time: endTime,
        capacity,
        location,
        tags: normalizeTags(tags),
      });

      res.json({
        success: true,
        data: updatedSession,
        message: 'Session updated successfully'
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete session (public - any authenticated user)
  static async deleteSessionPublic(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId as number | null;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please sign in to access this resource'
        });
        return;
      }

      // Check if session exists
      const existingSession = await SessionModel.findById(parseInt(id));
      if (!existingSession) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      // First delete all related attendance records
      await pool.query('DELETE FROM attendance WHERE reservation_id IN (SELECT id FROM reservations WHERE session_id = $1)', [parseInt(id)]);
      
      // Then delete all related reservations
      await pool.query('DELETE FROM reservations WHERE session_id = $1', [parseInt(id)]);
      
      // Finally delete the session
      const deleted = await SessionModel.delete(parseInt(id));
      
      if (deleted) {
        res.json({
          success: true,
          message: 'Session and all related reservations deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete session'
        });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete session (organizer only)
  static async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const organizerId = (req as any).userId as number | null;

      if (!organizerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please sign in to access this resource'
        });
        return;
      }

      // Check if session exists and belongs to organizer
      const existingSession = await SessionModel.findById(parseInt(id));
      if (!existingSession) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      if (existingSession.created_by !== organizerId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only delete your own sessions'
        });
        return;
      }

      const deleted = await SessionModel.delete(parseInt(id));
      
      if (deleted) {
        res.json({
          success: true,
          message: 'Session deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete session'
        });
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

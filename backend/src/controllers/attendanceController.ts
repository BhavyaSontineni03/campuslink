import { Request, Response } from 'express';
import { AttendanceModel } from '../models/Attendance';
import { ReservationModel } from '../models/Reservation';
import { CheckinRequest, CheckoutRequest } from '../types';

export class AttendanceController {
  // Check in to a session
  static async checkIn(req: Request, res: Response): Promise<void> {
    try {
      const { reservation_id }: CheckinRequest = req.body;
      
      if (!reservation_id) {
        res.status(400).json({
          success: false,
          error: 'Missing reservation_id',
          message: 'reservation_id is required'
        });
        return;
      }
      
      // Check if user can check in (reservation must be approved)
      const canCheckIn = await ReservationModel.canCheckIn(reservation_id, (req as any).userId || 0);
      
      if (!canCheckIn) {
        res.status(400).json({
          success: false,
          error: 'Cannot check in',
          message: 'Reservation must be approved to check in'
        });
        return;
      }
      
      // Check if already checked in
      const existingAttendance = await AttendanceModel.findByReservationId(reservation_id);
      if (existingAttendance && existingAttendance.checkin_time) {
        res.status(400).json({
          success: false,
          error: 'Already checked in',
          message: 'You have already checked in to this session'
        });
        return;
      }
      
      const attendance = await AttendanceModel.checkIn(reservation_id);
      
      res.json({
        success: true,
        data: attendance,
        message: 'Checked in successfully'
      });
    } catch (error) {
      console.error('Error checking in:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check in',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Check out of a session
  static async checkOut(req: Request, res: Response): Promise<void> {
    try {
      const { reservation_id }: CheckoutRequest = req.body;
      
      if (!reservation_id) {
        res.status(400).json({
          success: false,
          error: 'Missing reservation_id',
          message: 'reservation_id is required'
        });
        return;
      }
      
      // Check if checked in
      const existingAttendance = await AttendanceModel.findByReservationId(reservation_id);
      if (!existingAttendance || !existingAttendance.checkin_time) {
        res.status(400).json({
          success: false,
          error: 'Not checked in',
          message: 'You must check in before checking out'
        });
        return;
      }
      
      if (existingAttendance.checkout_time) {
        res.status(400).json({
          success: false,
          error: 'Already checked out',
          message: 'You have already checked out of this session'
        });
        return;
      }
      
      const attendance = await AttendanceModel.checkOut(reservation_id);
      
      res.json({
        success: true,
        data: attendance,
        message: 'Checked out successfully'
      });
    } catch (error) {
      console.error('Error checking out:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check out',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user's attendance statistics
  static async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const stats = await AttendanceModel.getUserStats(parseInt(userId));
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user's current streak
  static async getCurrentStreak(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const streak = await AttendanceModel.getCurrentStreak(parseInt(userId));
      
      res.json({
        success: true,
        data: { current_streak: streak }
      });
    } catch (error) {
      console.error('Error fetching current streak:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch current streak',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user's longest streak
  static async getLongestStreak(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const streak = await AttendanceModel.getLongestStreak(parseInt(userId));
      
      res.json({
        success: true,
        data: { longest_streak: streak }
      });
    } catch (error) {
      console.error('Error fetching longest streak:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch longest streak',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get session attendance
  static async getSessionAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const attendance = await AttendanceModel.getSessionAttendance(parseInt(sessionId));
      
      res.json({
        success: true,
        data: attendance,
        count: attendance.length
      });
    } catch (error) {
      console.error('Error fetching session attendance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session attendance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get recent attendance activity
  static async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await AttendanceModel.getRecentActivity(limit);
      
      res.json({
        success: true,
        data: activity,
        count: activity.length
      });
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent activity',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get attendance record by reservation ID
  static async getAttendanceByReservation(req: Request, res: Response): Promise<void> {
    try {
      const { reservationId } = req.params;
      const attendance = await AttendanceModel.findByReservationId(parseInt(reservationId));
      
      if (!attendance) {
        // This is expected for approved reservations where user hasn't checked in yet
        // Don't log as error - just return 404 silently
        res.status(404).json({
          success: false,
          error: 'Attendance record not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: attendance
      });
    } catch (error) {
      console.error('Error fetching attendance record:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch attendance record',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

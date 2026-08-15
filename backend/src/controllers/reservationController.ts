import { Request, Response } from 'express';
import { ReservationModel } from '../models/Reservation';
import { NotificationModel } from '../models/Notification';
import { NotificationService } from '../services/notificationService';
import { CreateReservationRequest, CreateReservationResponse } from '../types';

export class ReservationController {
  // Request a reservation
  static async requestReservation(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, session_id }: CreateReservationRequest = req.body;
      
      // Validate required fields
      if (!user_id || !session_id) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'user_id and session_id are required'
        });
        return;
      }
      
      // Validate user_id and session_id are numbers
      if (typeof user_id !== 'number' || typeof session_id !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Invalid data types',
          message: 'user_id and session_id must be numbers'
        });
        return;
      }
      
      const result = await ReservationModel.requestReservation(user_id, session_id);

      try {
        const { recordInteraction } = await import('../services/interactionService');
        const { logFunnelEvent } = await import('../services/funnelService');
        await recordInteraction(user_id, session_id, 'register');
        await logFunnelEvent(session_id, 'completed_registration', user_id);
      } catch (trackingError) {
        console.error('Error logging engagement events:', trackingError);
      }

      try {
        const { broadcastToUser } = await import('../ws');
        await broadcastToUser(user_id, {
          type: 'reservation_updated',
          payload: { session_id, status: result.status, reservation_id: result.reservation_id },
        });
        await broadcastToUser(user_id, {
          type: 'seats_changed',
          payload: { session_id },
        });
      } catch (wsError) {
        console.error('Error broadcasting reservation update:', wsError);
      }
      
      // Create notifications
      try {
        const session = await ReservationModel.getSessionDetails(session_id);
        if (session) {
          if (result.status === 'approved') {
            // Notify the user of booking confirmation
            await NotificationModel.createBookingConfirmation(
              user_id, 
              session.title, 
              session.start_time
            );
            
            // Notify friends of the booking
            await NotificationService.notifyFriendsOfBooking(
              user_id,
              session.title,
              session.start_time
            );
          }
        }
      } catch (notificationError) {
        console.error('Error creating notifications:', notificationError);
        // Don't fail the reservation if notification fails
      }
      
      const response: CreateReservationResponse = {
        reservation_id: result.reservation_id,
        status: result.status,
        message: result.status === 'approved' 
          ? 'Reservation approved successfully' 
          : 'Reservation added to waitlist'
      };
      
      res.status(201).json({
        success: true,
        data: response
      });
    } catch (error: any) {
      console.error('Error requesting reservation:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        res.status(409).json({
          success: false,
          error: 'Duplicate reservation',
          message: 'User already has a reservation for this session'
        });
        return;
      }
      
      if (error.message && error.message.includes('already has a reservation')) {
        res.status(409).json({
          success: false,
          error: 'Duplicate reservation',
          message: error.message
        });
        return;
      }
      
      if (error.message && error.message.includes('Session does not exist')) {
        res.status(404).json({
          success: false,
          error: 'Session not found',
          message: error.message
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to request reservation',
        message: error.message || 'Unknown error'
      });
    }
  }

  // Cancel a reservation
  static async cancelReservation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { user_id } = req.body;
      
      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'Missing user_id',
          message: 'user_id is required in request body'
        });
        return;
      }
      
      const success = await ReservationModel.cancelReservation(parseInt(id), user_id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Reservation not found',
          message: 'Reservation not found or does not belong to user'
        });
        return;
      }

      try {
        const { broadcastToUser } = await import('../ws');
        await broadcastToUser(user_id, {
          type: 'reservation_updated',
          payload: { reservation_id: parseInt(id), status: 'cancelled' },
        });
        await broadcastToUser(user_id, {
          type: 'seats_changed',
          payload: { reservation_id: parseInt(id) },
        });
      } catch (wsError) {
        console.error('Error broadcasting cancellation:', wsError);
      }

      // Create cancellation notification
      try {
        const reservation = await ReservationModel.findByIdWithSession(parseInt(id));
        if (reservation && reservation.session) {
          await NotificationService.notifyBookingCancellation(
            user_id,
            reservation.session.title,
            reservation.session.start_time.toISOString()
          );
        }
      } catch (notificationError) {
        console.error('Error creating cancellation notification:', notificationError);
        // Don't fail the cancellation if notification fails
      }
      
      res.json({
        success: true,
        message: 'Reservation cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel reservation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user's reservations
  static async getUserReservations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status } = req.query;
      
      let reservations;
      if (status) {
        reservations = await ReservationModel.findByUserIdAndStatus(parseInt(userId), status as string);
      } else {
        reservations = await ReservationModel.findByUserId(parseInt(userId));
      }
      
      res.json({
        success: true,
        data: reservations,
        count: reservations.length
      });
    } catch (error) {
      console.error('Error fetching user reservations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reservations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get reservation by ID
  static async getReservationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const reservation = await ReservationModel.findByIdWithSession(parseInt(id));
      
      if (!reservation) {
        res.status(404).json({
          success: false,
          error: 'Reservation not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: reservation
      });
    } catch (error) {
      console.error('Error fetching reservation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reservation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get waitlist position
  static async getWaitlistPosition(req: Request, res: Response): Promise<void> {
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
      
      const position = await ReservationModel.getWaitlistPosition(parseInt(id), userId);
      
      if (position === null) {
        res.status(404).json({
          success: false,
          error: 'Reservation not found or not waitlisted',
          message: 'Reservation not found, does not belong to user, or is not waitlisted'
        });
        return;
      }
      
      res.json({
        success: true,
        data: { position }
      });
    } catch (error) {
      console.error('Error fetching waitlist position:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch waitlist position',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get session waitlist
  static async getSessionWaitlist(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const waitlist = await ReservationModel.getSessionWaitlist(parseInt(sessionId));
      
      res.json({
        success: true,
        data: waitlist,
        count: waitlist.length
      });
    } catch (error) {
      console.error('Error fetching session waitlist:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch session waitlist',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user's attendance history
  static async getAttendanceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const history = await ReservationModel.getAttendanceHistory(parseInt(userId));
      
      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch attendance history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

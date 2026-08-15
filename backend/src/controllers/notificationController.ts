import { Request, Response } from 'express';
import { NotificationModel } from '../models/Notification';

export class NotificationController {
  // Get notifications for the current user
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID'
        });
        return;
      }

      const result = await NotificationModel.getByUserId(userId, page, limit);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get unread notifications count
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID'
        });
        return;
      }

      const count = await NotificationModel.getUnreadCount(userId);

      res.json({
        success: true,
        data: { unread_count: count }
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unread count',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Mark notification as read
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const notificationId = parseInt(req.params.notificationId);

      if (isNaN(userId) || isNaN(notificationId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID or notification ID'
        });
        return;
      }

      await NotificationModel.markAsRead(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID'
        });
        return;
      }

      await NotificationModel.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete notification
  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const notificationId = parseInt(req.params.notificationId);

      if (isNaN(userId) || isNaN(notificationId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID or notification ID'
        });
        return;
      }

      await NotificationModel.delete(notificationId, userId);

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Create notification (for testing or admin use)
  static async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, type, title, message, data } = req.body;

      if (!user_id || !type || !title || !message) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: user_id, type, title, message'
        });
        return;
      }

      const notification = await NotificationModel.create({
        user_id,
        type,
        title,
        message,
        data
      });

      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

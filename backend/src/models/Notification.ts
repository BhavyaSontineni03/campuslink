import { pool } from '../config/database';

export interface Notification {
  id: number;
  user_id: number;
  type: 'booking_confirmed' | 'booking_cancelled' | 'waitlist_promoted' | 'session_reminder' | 'new_session' | 'friend_activity' | 'system';
  title: string;
  message: string;
  data?: any; // JSON data for additional context
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface CreateNotificationRequest {
  user_id: number;
  type: Notification['type'];
  title: string;
  message: string;
  data?: any;
}

export class NotificationModel {
  // Create a new notification
  static async create(notification: CreateNotificationRequest): Promise<Notification> {
    const { rows } = await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, data, is_read) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.data ? JSON.stringify(notification.data) : null,
        false
      ]
    );

    return this.getById(rows[0].id);
  }

  // Get notification by ID
  static async getById(id: number): Promise<Notification> {
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE id = $1',
      [id]
    );

    const notification = rows[0];
    if (notification && notification.data) {
      if (typeof notification.data === 'string') {
        try {
          notification.data = JSON.parse(notification.data);
        } catch (e) {
          // If JSON parsing fails, keep the original value
          console.warn('Failed to parse notification data:', notification.data);
        }
      }
      // If it's already an object, leave it as is
    }

    return notification;
  }

  // Get notifications for a user with pagination
  static async getByUserId(
    userId: number, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{ notifications: Notification[]; total: number }> {
    const offset = (page - 1) * limit;

    // Get notifications
    const { rows } = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const { rows: countRows } = await pool.query(
      'SELECT COUNT(*)::int as total FROM notifications WHERE user_id = $1',
      [userId]
    );

    const notifications = rows.map(notification => {
      if (notification.data) {
        if (typeof notification.data === 'string') {
          try {
            notification.data = JSON.parse(notification.data);
          } catch (e) {
            // If JSON parsing fails, keep the original value
            console.warn('Failed to parse notification data:', notification.data);
          }
        }
        // If it's already an object, leave it as is
      }
      return notification;
    });

    return {
      notifications,
      total: countRows[0].total
    };
  }

  // Get unread notifications count for a user
  static async getUnreadCount(userId: number): Promise<number> {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    return rows[0].count;
  }

  // Mark notification as read
  static async markAsRead(id: number, userId: number): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: number): Promise<void> {
    await pool.query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  }

  // Delete notification
  static async delete(id: number, userId: number): Promise<void> {
    await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
  }

  // Create notification for booking confirmation
  static async createBookingConfirmation(userId: number, sessionTitle: string, sessionDate: string): Promise<Notification> {
    return this.create({
      user_id: userId,
      type: 'booking_confirmed',
      title: 'Booking Confirmed! 🎉',
      message: `Your booking for "${sessionTitle}" on ${new Date(sessionDate).toLocaleDateString()} has been confirmed.`,
      data: { session_title: sessionTitle, session_date: sessionDate }
    });
  }

  // Create notification for booking cancellation
  static async createBookingCancellation(userId: number, sessionTitle: string, sessionDate: string): Promise<Notification> {
    return this.create({
      user_id: userId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `Your booking for "${sessionTitle}" on ${new Date(sessionDate).toLocaleDateString()} has been cancelled.`,
      data: { session_title: sessionTitle, session_date: sessionDate }
    });
  }

  // Create notification for waitlist promotion
  static async createWaitlistPromotion(userId: number, sessionTitle: string, sessionDate: string): Promise<Notification> {
    return this.create({
      user_id: userId,
      type: 'waitlist_promoted',
      title: 'You\'re In! 🚀',
      message: `Great news! You've been promoted from the waitlist for "${sessionTitle}" on ${new Date(sessionDate).toLocaleDateString()}.`,
      data: { session_title: sessionTitle, session_date: sessionDate }
    });
  }

  // Create notification for session reminder
  static async createSessionReminder(userId: number, sessionTitle: string, sessionDate: string): Promise<Notification> {
    return this.create({
      user_id: userId,
      type: 'session_reminder',
      title: 'Session Reminder ⏰',
      message: `Don't forget! "${sessionTitle}" is coming up on ${new Date(sessionDate).toLocaleDateString()}.`,
      data: { session_title: sessionTitle, session_date: sessionDate }
    });
  }

  // Create notification for new session
  static async createNewSessionNotification(userId: number, sessionTitle: string, sessionDate: string): Promise<Notification> {
    return this.create({
      user_id: userId,
      type: 'new_session',
      title: 'New Session Available! 🆕',
      message: `A new session "${sessionTitle}" has been added for ${new Date(sessionDate).toLocaleDateString()}. Book now!`,
      data: { session_title: sessionTitle, session_date: sessionDate }
    });
  }

  // Create notification for friend activity
  static async createFriendActivityNotification(userId: number, friendName: string, activity: string): Promise<Notification> {
    return this.create({
      user_id: userId,
      type: 'friend_activity',
      title: 'Friend Activity 👥',
      message: `${friendName} ${activity}.`,
      data: { friend_name: friendName, activity }
    });
  }
}

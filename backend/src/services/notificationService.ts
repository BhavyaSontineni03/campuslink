import { NotificationModel } from '../models/Notification';
import { pool } from '../config/database';

export class NotificationService {
  // Notify friends when a user books a session
  static async notifyFriendsOfBooking(userId: number, sessionTitle: string, sessionDate: string): Promise<void> {
    try {
      // Get all friends of the user
      const { rows: friends } = await pool.query(
        'SELECT target_user_id FROM follows WHERE user_id = $1',
        [userId]
      );
      
      // Create notifications for each friend
      for (const friend of friends) {
        try {
          await NotificationModel.createFriendActivityNotification(
            friend.target_user_id,
            'Someone you follow', // We'll get the actual name in a more complex implementation
            `just booked "${sessionTitle}" for ${new Date(sessionDate).toLocaleDateString()}`
          );
        } catch (error) {
          console.error(`Error creating notification for friend ${friend.target_user_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error notifying friends of booking:', error);
    }
  }

  // Notify user when promoted from waitlist (optimized with retry logic)
  static async notifyWaitlistPromotion(userId: number, sessionTitle: string, sessionDate: string): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await NotificationModel.createWaitlistPromotion(userId, sessionTitle, sessionDate);
        try {
          const { broadcastToUser } = await import('../ws');
          await broadcastToUser(userId, {
            type: 'waitlist_promoted',
            payload: { title: sessionTitle, sessionDate },
          });
        } catch {
          // realtime is best-effort
        }
        console.log(`Waitlist promotion notification created for user ${userId}`);
        return; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        console.error(`❌ Error creating waitlist promotion notification (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          console.error('❌ Max retries reached for waitlist promotion notification, giving up');
          return;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 50));
      }
    }
  }

  // Notify user when booking is cancelled
  static async notifyBookingCancellation(userId: number, sessionTitle: string, sessionDate: string): Promise<void> {
    try {
      await NotificationModel.createBookingCancellation(userId, sessionTitle, sessionDate);
    } catch (error) {
      console.error('Error creating booking cancellation notification:', error);
    }
  }

  // Notify all users when a new session is created
  static async notifyNewSession(sessionTitle: string, sessionDate: string): Promise<void> {
    try {
      // Get all users
      const { rows: users } = await pool.query('SELECT id FROM users');
      
      // Create notifications for each user
      for (const user of users) {
        try {
          await NotificationModel.createNewSessionNotification(
            user.id,
            sessionTitle,
            sessionDate
          );
        } catch (error) {
          console.error(`Error creating new session notification for user ${user.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error notifying users of new session:', error);
    }
  }

  // Send session reminders (this would typically be called by a cron job)
  static async sendSessionReminders(): Promise<void> {
    try {
      // Get sessions starting in the next 24 hours
      const { rows: sessions } = await pool.query(`
        SELECT s.id, s.title, s.start_time, r.user_id
        FROM sessions s
        JOIN reservations r ON s.id = r.session_id
        WHERE r.status = 'approved'
        AND s.start_time BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      `);
      
      // Create reminder notifications
      for (const session of sessions) {
        try {
          await NotificationModel.createSessionReminder(
            session.user_id,
            session.title,
            session.start_time
          );
        } catch (error) {
          console.error(`Error creating reminder for user ${session.user_id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error sending session reminders:', error);
    }
  }
}

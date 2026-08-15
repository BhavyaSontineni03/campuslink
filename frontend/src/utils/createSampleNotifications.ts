import { notificationApi } from '../services/api';

// Create sample notifications for testing
export const createSampleNotifications = async (userId: number) => {
  const sampleNotifications = [
    {
      user_id: userId,
      type: 'booking_confirmed',
      title: 'Booking Confirmed! 🎉',
      message: 'Your booking for "Morning Yoga Session" on Oct 18, 2025 has been confirmed.',
      data: { session_title: 'Morning Yoga Session', session_date: '2025-10-18' }
    },
    {
      user_id: userId,
      type: 'waitlist_promoted',
      title: 'You\'re In! 🚀',
      message: 'Great news! You\'ve been promoted from the waitlist for "Advanced Coding Workshop" on Oct 20, 2025.',
      data: { session_title: 'Advanced Coding Workshop', session_date: '2025-10-20' }
    },
    {
      user_id: userId,
      type: 'session_reminder',
      title: 'Session Reminder ⏰',
      message: 'Don\'t forget! "Fitness Bootcamp" is coming up on Oct 19, 2025.',
      data: { session_title: 'Fitness Bootcamp', session_date: '2025-10-19' }
    },
    {
      user_id: userId,
      type: 'new_session',
      title: 'New Session Available! 🆕',
      message: 'A new session "Photography Masterclass" has been added for Oct 22, 2025. Book now!',
      data: { session_title: 'Photography Masterclass', session_date: '2025-10-22' }
    },
    {
      user_id: userId,
      type: 'friend_activity',
      title: 'Friend Activity 👥',
      message: 'John Doe just booked "Cooking Workshop" for Oct 21, 2025.',
      data: { friend_name: 'John Doe', activity: 'just booked "Cooking Workshop" for Oct 21, 2025' }
    },
    {
      user_id: userId,
      type: 'system',
      title: 'Welcome to CampusLink',
      message: 'Thanks for joining our platform. Start exploring sessions and connecting with friends!',
      data: {}
    }
  ];

  try {
    // Create all sample notifications
    for (const notification of sampleNotifications) {
      await notificationApi.create(notification);
    }
    console.log('Sample notifications created successfully!');
  } catch (error) {
    console.error('Error creating sample notifications:', error);
  }
};

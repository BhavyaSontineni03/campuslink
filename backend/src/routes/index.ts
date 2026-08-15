import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';
import { ReservationController } from '../controllers/reservationController';
import { AttendanceController } from '../controllers/attendanceController';
import { UserController } from '../controllers/userController';
import { AdminController } from '../controllers/adminController';
import { AuthController } from '../controllers/authController';
import { NotificationController } from '../controllers/notificationController';
import { FavoriteController } from '../controllers/favoriteController';
import { EngagementController } from '../controllers/engagementController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireAdmin, requireOrganizer, requireSuperAdmin } from '../middleware/adminAuth';

const router = Router();

// Engagement: recommendations, FTS search, interactions, funnel, bandit
router.get('/feed/recommended', authenticate, EngagementController.recommendedFeed);
router.get('/sessions/search', optionalAuth, EngagementController.search);
router.post('/interactions', authenticate, EngagementController.createInteraction);
router.post('/funnel/events', optionalAuth, EngagementController.createFunnelEvent);
router.get('/analytics/funnel', requireOrganizer, EngagementController.funnelAnalytics);
router.get('/analytics/bandit', requireOrganizer, EngagementController.banditAnalytics);
router.post('/notifications/schedule-reminder', authenticate, EngagementController.scheduleTestReminder);

// Authentication routes (public)
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
// router.post('/auth/change-password/:userId', authenticate, AuthController.changePassword);

// Public routes (no authentication required)
router.get('/sessions', optionalAuth, SessionController.getAllSessions);
router.get('/sessions/popular', optionalAuth, SessionController.getPopularSessions);
router.get('/sessions/utilization', SessionController.getUtilizationStats);
router.get('/sessions/categories', SessionController.getCategories);
router.get('/sessions/:id', SessionController.getSessionById);

// Protected routes (authentication required)
router.post('/sessions', authenticate, SessionController.createSession);
router.put('/sessions/:id', authenticate, SessionController.updateSessionPublic);
router.delete('/sessions/:id', authenticate, SessionController.deleteSessionPublic);

// Reservation routes (all require authentication)
router.post('/reservations', authenticate, ReservationController.requestReservation);
router.get('/reservations/:id', authenticate, ReservationController.getReservationById);
router.patch('/reservations/:id/cancel', authenticate, ReservationController.cancelReservation);
router.get('/reservations/:id/waitlist-position', authenticate, ReservationController.getWaitlistPosition);
router.get('/users/:userId/reservations', authenticate, ReservationController.getUserReservations);
router.get('/users/:userId/attendance-history', authenticate, ReservationController.getAttendanceHistory);
router.get('/sessions/:sessionId/waitlist', authenticate, ReservationController.getSessionWaitlist);

// Attendance routes (all require authentication)
router.post('/attendance/checkin', authenticate, AttendanceController.checkIn);
router.post('/attendance/checkout', authenticate, AttendanceController.checkOut);
router.get('/attendance/recent', optionalAuth, AttendanceController.getRecentActivity);
router.get('/attendance/:reservationId', authenticate, AttendanceController.getAttendanceByReservation);
router.get('/users/:userId/attendance-stats', authenticate, AttendanceController.getUserStats);
router.get('/users/:userId/current-streak', authenticate, AttendanceController.getCurrentStreak);
router.get('/users/:userId/longest-streak', authenticate, AttendanceController.getLongestStreak);
router.get('/sessions/:sessionId/attendance', authenticate, AttendanceController.getSessionAttendance);

// User routes
router.get('/users', optionalAuth, UserController.getAllUsers);
router.get('/users/:id', optionalAuth, UserController.getUserById);
router.get('/users/:id/stats', authenticate, UserController.getUserWithStats);
router.get('/users/:id/friends', authenticate, UserController.getUserFriends);
router.get('/users/:id/friends-attending', authenticate, UserController.getFriendsAttendingSession);
router.post('/users', UserController.createUser);
router.post('/users/:id/follow', authenticate, UserController.followUser);
router.delete('/users/:id/follow', authenticate, UserController.unfollowUser);
router.patch('/users/:id/profile', authenticate, UserController.updateUserProfile);

// Notification routes (all require authentication)
router.get('/users/:userId/notifications', authenticate, NotificationController.getNotifications);
router.get('/users/:userId/notifications/unread-count', authenticate, NotificationController.getUnreadCount);
router.patch('/users/:userId/notifications/:notificationId/read', authenticate, NotificationController.markAsRead);
router.patch('/users/:userId/notifications/read-all', authenticate, NotificationController.markAllAsRead);
router.delete('/users/:userId/notifications/:notificationId', authenticate, NotificationController.deleteNotification);
router.post('/notifications', authenticate, NotificationController.createNotification);

// Favorite routes (all require authentication)
router.post('/users/:userId/favorites/:sessionId', authenticate, FavoriteController.addToFavorites);
router.delete('/users/:userId/favorites/:sessionId', authenticate, FavoriteController.removeFromFavorites);
router.patch('/users/:userId/favorites/:sessionId/toggle', authenticate, FavoriteController.toggleFavorite);
router.get('/users/:userId/favorites', authenticate, FavoriteController.getUserFavorites);
router.get('/users/:userId/favorites/:sessionId/status', authenticate, FavoriteController.checkFavoriteStatus);

// Admin routes (require admin authentication)
router.get('/admin/overview', requireAdmin, AdminController.getSystemOverview);
router.get('/admin/users', requireAdmin, AdminController.getAllUsers);
router.patch('/admin/users/:userId/role', requireAdmin, AdminController.updateUserRole);
router.patch('/admin/users/:userId/status', requireAdmin, AdminController.toggleUserStatus);
router.delete('/admin/users/:userId', requireAdmin, AdminController.deleteUser);
router.get('/admin/sessions', requireAdmin, AdminController.getAllSessions);
router.delete('/admin/sessions/:sessionId', requireAdmin, AdminController.deleteSession);
router.get('/admin/reservations', requireAdmin, AdminController.getAllReservations);
router.patch('/admin/reservations/:reservationId/status', requireAdmin, AdminController.updateReservationStatus);
router.get('/admin/analytics', requireAdmin, AdminController.getSystemAnalytics);

// Super Admin routes (require super admin authentication)
// router.get('/admin/audit-logs', requireSuperAdmin, AdminController.getAuditLogs);
// router.get('/admin/super-admin', requireSuperAdmin, AdminController.getSuperAdminPanel);

// Organizer routes (require organizer or admin authentication)
router.get('/organizer/sessions', requireOrganizer, SessionController.getOrganizerSessions);
router.post('/organizer/sessions', requireOrganizer, SessionController.createSession);
router.get('/organizer/sessions/:id', requireOrganizer, SessionController.getSessionById);
router.put('/organizer/sessions/:id', requireOrganizer, SessionController.updateSession);
router.delete('/organizer/sessions/:id', requireOrganizer, SessionController.deleteSession);

export default router;

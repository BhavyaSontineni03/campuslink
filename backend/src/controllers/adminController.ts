import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { SessionModel } from '../models/Session';
import { ReservationModel } from '../models/Reservation';
import { AttendanceModel } from '../models/Attendance';
import { AuditLogger } from '../utils/auditLogger';
import { canManageUser, hasPermission, canDeleteUser, UserRole } from '../utils/roleHierarchy';

export class AdminController {
  // Get system overview statistics
  static async getSystemOverview(req: Request, res: Response): Promise<void> {
    try {
      // Get total users
      const totalUsers = await UserModel.count();
      
      // Get total sessions
      const totalSessions = await SessionModel.count();
      
      // Get total reservations
      const totalReservations = await ReservationModel.count();
      
      // Get active sessions (future sessions)
      const activeSessions = await SessionModel.countActive();
      
      // Get recent activity count
      const recentActivity = await AttendanceModel.getRecentActivityCount();
      
      res.json({
        success: true,
        data: {
          totalUsers,
          totalSessions,
          totalReservations,
          activeSessions,
          recentActivity
        }
      });
    } catch (error) {
      console.error('Error fetching system overview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get all users with pagination
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '20', role, search } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const users = await UserModel.findAllWithFilters({
        role: role as string,
        search: search as string,
        limit: limitNum,
        offset
      });

      // Remove sensitive data from users
      const sanitizedUsers = users.map((user: any) => {
        const { password_hash, ...safeUser } = user;
        return safeUser;
      });

      const total = await UserModel.countWithFilters({
        role: role as string,
        search: search as string
      });

      res.json({
        success: true,
        data: sanitizedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update user role
  static async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const currentUserId = (req as any).userId;
      const currentUserRole = (req as any).userRole;

      if (!role || !['student', 'organizer', 'admin', 'super_admin'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role',
          message: 'Role must be student, organizer, admin, or super_admin'
        });
        return;
      }

      // Security: Prevent unauthorized super admin role assignment
      if (role === 'super_admin' && currentUserRole !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: 'Only Super Admins can assign Super Admin role'
        });
        return;
      }

      // Get target user to check their current role
      const targetUser = await UserModel.findById(parseInt(userId));
      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found'
        });
        return;
      }

      // Check if current user can manage this user
      const targetUserRole = (targetUser.role as 'student' | 'organizer' | 'admin' | 'super_admin') || 'student';
      if (!canManageUser(currentUserRole, targetUserRole)) {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: 'You do not have permission to manage this user'
        });
        return;
      }

      // Check if trying to promote to super_admin (only super_admin can do this)
      if (role === 'super_admin' && currentUserRole !== 'super_admin') {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: 'Only super administrators can promote users to super admin'
        });
        return;
      }

      const oldRole = targetUser.role || 'student';
      const updated = await UserModel.updateRole(parseInt(userId), role);
      
      if (!updated) {
        res.status(500).json({
          success: false,
          error: 'Update failed',
          message: 'Could not update user role'
        });
        return;
      }

      // Log the action
      await AuditLogger.logAction(req, {
        adminId: currentUserId,
        action: 'UPDATE_USER_ROLE',
        targetUserId: parseInt(userId),
        oldValue: oldRole,
        newValue: role,
        details: `Changed user role from ${oldRole} to ${role}`
      });

      res.json({
        success: true,
        message: 'User role updated successfully'
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user role',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Toggle user active status
  static async toggleUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      const updated = await UserModel.updateStatus(parseInt(userId), isActive);
      
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
        return;
      }

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle user status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Delete user
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).userId;
      const currentUserRole = (req as any).userRole as UserRole;

      if (!currentUserId || !currentUserRole) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated'
        });
        return;
      }

      // Get target user details
      const targetUser = await UserModel.findById(parseInt(userId));
      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
        return;
      }

      const targetUserRole = targetUser.role as UserRole;

      // Check if current user can delete this user
      if (!canDeleteUser(currentUserRole, targetUserRole)) {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: 'You do not have permission to delete this user'
        });
        return;
      }

      // Prevent self-deletion
      if (currentUserId === parseInt(userId)) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete self',
          message: 'You cannot delete your own account'
        });
        return;
      }

      // Log the action BEFORE deletion (to avoid foreign key constraint issues)
      await AuditLogger.logAction(req, {
        adminId: currentUserId,
        action: 'DELETE_USER',
        targetUserId: parseInt(userId),
        oldValue: targetUserRole,
        newValue: undefined,
        details: `Deleted user: ${targetUser.name} (${targetUser.email})`
      });

      // Delete the user
      const deleted = await UserModel.delete(parseInt(userId));
      
      if (!deleted) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete user',
          message: 'Could not delete user'
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get all sessions with admin details
  static async getAllSessions(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '20', category, status } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const sessions = await SessionModel.findAllWithAdminDetails({
        category: category as string,
        status: status as string,
        limit: limitNum,
        offset
      });

      const total = await SessionModel.countWithFilters({
        category: category as string,
        status: status as string
      });

      res.json({
        success: true,
        data: sessions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
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

  // Delete session
  static async deleteSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const deleted = await SessionModel.delete(parseInt(sessionId));
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Session not found',
          message: 'Session with the specified ID does not exist'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get all reservations with admin details
  static async getAllReservations(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '20', status, sessionId } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const reservations = await ReservationModel.findAllWithAdminDetails({
        status: status as string,
        sessionId: sessionId ? parseInt(sessionId as string) : undefined,
        limit: limitNum,
        offset
      });

      const total = await ReservationModel.countWithFilters({
        status: status as string,
        sessionId: sessionId ? parseInt(sessionId as string) : undefined
      });

      res.json({
        success: true,
        data: reservations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching reservations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reservations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update reservation status
  static async updateReservationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { reservationId } = req.params;
      const { status } = req.body;

      if (!status || !['requested', 'approved', 'waitlisted', 'cancelled'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status',
          message: 'Status must be requested, approved, waitlisted, or cancelled'
        });
        return;
      }

      const updated = await ReservationModel.updateStatus(parseInt(reservationId), status);
      
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Reservation not found',
          message: 'Reservation with the specified ID does not exist'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Reservation status updated successfully'
      });
    } catch (error) {
      console.error('Error updating reservation status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update reservation status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get system analytics
  static async getSystemAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30' } = req.query;
      const days = parseInt(period as string);

      const analytics = await SessionModel.getSystemAnalytics(days);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching system analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get audit logs (Super Admin only)
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 50, adminId, action } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const logs = await AuditLogger.getAuditLogs(
        Number(limit),
        offset,
        adminId ? Number(adminId) : undefined,
        action as string
      );

      const total = await AuditLogger.getAuditLogCount(
        adminId ? Number(adminId) : undefined,
        action as string
      );

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get super admin panel data
  static async getSuperAdminPanel(req: Request, res: Response): Promise<void> {
    try {
      // Get all admins and super admins
      const admins = await UserModel.findAllWithFilters({
        role: 'admin',
        limit: 100,
        offset: 0
      });

      const superAdmins = await UserModel.findAllWithFilters({
        role: 'super_admin',
        limit: 100,
        offset: 0
      });

      // Get recent audit logs
      const recentLogs = await AuditLogger.getAuditLogs(10, 0);

      res.json({
        success: true,
        data: {
          admins,
          superAdmins,
          recentLogs,
          systemInfo: {
            totalAdmins: admins.length,
            totalSuperAdmins: superAdmins.length,
            recentActivity: recentLogs.length
          }
        }
      });
    } catch (error) {
      console.error('Error fetching super admin panel:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch super admin panel',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

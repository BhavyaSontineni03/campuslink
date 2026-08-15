import { Request, Response } from 'express';
import { UserModel } from '../models/User';

export class UserController {
  // Get user by ID
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(parseInt(id));
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get user with statistics
  static async getUserWithStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await UserModel.findByIdWithStats(parseInt(id));
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: user
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

  // Get user's friends
  static async getUserFriends(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const friends = await UserModel.getFriends(parseInt(id));
      
      res.json({
        success: true,
        data: friends,
        count: friends.length
      });
    } catch (error) {
      console.error('Error fetching user friends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user friends',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Follow a user
  static async followUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { target_user_id } = req.body;
      
      if (!target_user_id) {
        res.status(400).json({
          success: false,
          error: 'Missing target_user_id',
          message: 'target_user_id is required'
        });
        return;
      }
      
      if (parseInt(id) === target_user_id) {
        res.status(400).json({
          success: false,
          error: 'Cannot follow yourself',
          message: 'You cannot follow yourself'
        });
        return;
      }
      
      const success = await UserModel.followUser(parseInt(id), target_user_id);
      
      if (!success) {
        res.status(409).json({
          success: false,
          error: 'Already following',
          message: 'You are already following this user'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'User followed successfully'
      });
    } catch (error) {
      console.error('Error following user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to follow user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Unfollow a user
  static async unfollowUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { target_user_id } = req.body;
      
      if (!target_user_id) {
        res.status(400).json({
          success: false,
          error: 'Missing target_user_id',
          message: 'target_user_id is required'
        });
        return;
      }
      
      const success = await UserModel.unfollowUser(parseInt(id), target_user_id);
      
      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Not following',
          message: 'You are not following this user'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'User unfollowed successfully'
      });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unfollow user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get friends attending a session
  static async getFriendsAttendingSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sessionId } = req.query;
      
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Missing sessionId',
          message: 'sessionId query parameter is required'
        });
        return;
      }
      
      const friends = await UserModel.getFriendsAttendingSession(parseInt(id), parseInt(sessionId as string));
      
      res.json({
        success: true,
        data: friends,
        count: friends.length
      });
    } catch (error) {
      console.error('Error fetching friends attending session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch friends attending session',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Create new user
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, avatar_url } = req.body;
      
      if (!email || !name) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'email and name are required'
        });
        return;
      }
      
      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User already exists',
          message: 'A user with this email already exists'
        });
        return;
      }
      
      const user = await UserModel.create({
        email,
        name,
        avatar_url
      });
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get all users (for admin purposes)
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '50', offset = '0' } = req.query;
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      
      const { rows } = await (await import('../config/database')).default.query(`
        SELECT * FROM users
        ORDER BY created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `);

      res.json({
        success: true,
        data: rows,
        count: (rows as any[]).length
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

  // Update user profile (name, email)
  static async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, email } = req.body;
      const currentUserId = (req as any).userId;
      
      // Check if user is updating their own profile or is an admin
      if (currentUserId !== parseInt(id)) {
        // Check if current user is admin or super admin
        const currentUser = await UserModel.findById(currentUserId);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
          res.status(403).json({
            success: false,
            error: 'Permission denied',
            message: 'You can only update your own profile or be an admin'
          });
          return;
        }
      }
      
      if (!name && !email) {
        res.status(400).json({
          success: false,
          error: 'Missing fields',
          message: 'Name or email is required'
        });
        return;
      }
      
      // Check if email is already taken by another user
      if (email) {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser && existingUser.id !== parseInt(id)) {
          res.status(400).json({
            success: false,
            error: 'Email already exists',
            message: 'This email is already registered to another user'
          });
          return;
        }
      }
      
      // Update user
      const updated = await UserModel.updateProfile(parseInt(id), { name, email });
      
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
        return;
      }
      
      // Get updated user data
      const user = await UserModel.findById(parseInt(id));
      
      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

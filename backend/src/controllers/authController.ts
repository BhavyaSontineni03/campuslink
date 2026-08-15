import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/User';
import { signToken } from '../utils/jwt';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, password, role = 'student' } = req.body;

      // Validate input
      if (!email || !name || !password) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'Email, name, and password are required'
        });
        return;
      }

      // Validate role - only allow student and organizer for self-registration
      if (role !== 'student' && role !== 'organizer') {
        res.status(400).json({
          success: false,
          error: 'Invalid role',
          message: 'Only student and organizer roles are allowed for self-registration'
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

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await UserModel.create({
        email,
        name,
        password_hash: passwordHash,
        role,
        is_active: true
      });

      // Remove password hash from response
      const { password_hash, ...userResponse } = user;

      const token = signToken({ userId: user.id, role: user.role! });

      res.status(201).json({
        success: true,
        data: { user: userResponse, token },
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Missing credentials',
          message: 'Email and password are required'
        });
        return;
      }

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user || !user.password_hash) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        });
        return;
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Invalid email or password'
        });
        return;
      }

      // Check if user is active
      if (!user.is_active) {
        res.status(403).json({
          success: false,
          error: 'Account inactive',
          message: 'Your account is currently inactive. Please contact support.'
        });
        return;
      }

      // Remove password hash from response
      const { password_hash, ...userResponse } = user;

      const token = signToken({ userId: user.id, role: user.role! });

      res.status(200).json({
        success: true,
        data: { user: userResponse, token },
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Error logging in user:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Change user password
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { oldPassword, newPassword } = req.body;
      const currentUserId = (req as any).userId;

      if (parseInt(userId) !== currentUserId) {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: 'You can only change your own password'
        });
        return;
      }

      if (!oldPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Missing credentials',
          message: 'Old password and new password are required'
        });
        return;
      }

      const user = await UserModel.findById(parseInt(userId));
      if (!user || !user.password_hash) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found'
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Old password is incorrect'
        });
        return;
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      const updated = await UserModel.updatePassword(parseInt(userId), newPasswordHash);

      if (!updated) {
        res.status(500).json({
          success: false,
          error: 'Update failed',
          message: 'Could not update password'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
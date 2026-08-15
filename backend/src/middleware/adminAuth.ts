import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { verifyToken } from '../utils/jwt';

function getVerifiedUserId(req: Request): number | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return verifyToken(header.slice('Bearer '.length)).userId;
  } catch {
    return null;
  }
}

async function requireRole(
  req: Request,
  res: Response,
  next: NextFunction,
  allowedRoles: string[],
  deniedMessage: string
): Promise<void> {
  const userId = getVerifiedUserId(req);

  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please sign in to access this resource',
    });
    return;
  }

  try {
    const { rows: users } = await pool.query(
      'SELECT role FROM users WHERE id = $1 AND is_active = TRUE',
      [userId]
    );

    if (users.length === 0 || !allowedRoles.includes(users[0].role)) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: deniedMessage,
      });
      return;
    }

    (req as any).userId = userId;
    (req as any).userRole = users[0].role;
    next();
  } catch (error) {
    console.error('Error checking role:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify privileges',
    });
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) =>
  requireRole(req, res, next, ['admin', 'super_admin'], 'This resource requires administrator privileges');

export const requireOrganizer = (req: Request, res: Response, next: NextFunction) =>
  requireRole(req, res, next, ['organizer', 'admin', 'super_admin'], 'This resource requires organizer or admin privileges');

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) =>
  requireRole(req, res, next, ['super_admin'], 'This resource requires super administrator privileges');

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

// Requires a valid JWT. Populates req.userId and req.userRole from the token.
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please sign in to access this resource',
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    (req as any).userId = payload.userId;
    (req as any).userRole = payload.role;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      message: 'Please sign in again',
    });
  }
};

// Populates req.userId/req.userRole if a valid token is present, but never rejects.
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      (req as any).userId = payload.userId;
      (req as any).userRole = payload.role;
    } catch {
      // Ignore invalid tokens on optional routes - treat as anonymous.
    }
  }
  next();
};

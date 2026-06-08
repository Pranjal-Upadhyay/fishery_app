/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user context to requests.
 * Also provides role-based access control helpers.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// JWT secret — fail fast in production if not configured.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is not set.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_fallback_not_for_production';

export interface AuthPayload {
  userId: string;
  role: 'FARMER' | 'DOCTOR' | 'ADMIN' | 'HATCHERY';
}

// Extend Express Request to include the authenticated user.
declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/**
 * Middleware that REQUIRES a valid JWT.
 * Returns 401 if token is missing or invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = header.slice(7); // strip "Bearer "
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (!decoded.userId || !decoded.role) {
      res.status(401).json({ success: false, error: 'Invalid token payload' });
      return;
    }
    req.auth = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'Token expired' });
      return;
    }
    logger.warn('JWT verification failed', { error: err.message });
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

/**
 * Middleware that OPTIONALLY attaches auth context.
 * Does NOT reject unauthenticated requests — useful for public
 * endpoints that behave differently for logged-in users.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (decoded.userId && decoded.role) {
      req.auth = decoded;
    }
  } catch {
    // Token is invalid — treat as unauthenticated
  }
  next();
}

/**
 * Factory: require that the authenticated user has one of the specified roles.
 * Must be used AFTER requireAuth.
 */
export function requireRole(...roles: Array<'FARMER' | 'DOCTOR' | 'ADMIN' | 'HATCHERY'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.auth.role as any)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

/**
 * Helper: assert that the requesting user matches the resource owner.
 * Returns true if authorized, sends 403 and returns false otherwise.
 */
export function assertOwnership(req: Request, res: Response, resourceOwnerId: string): boolean {
  if (!req.auth) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return false;
  }
  // Admins can access any resource
  if (req.auth.role === 'ADMIN') return true;
  if (req.auth.userId !== resourceOwnerId) {
    res.status(403).json({ success: false, error: 'Access denied: you do not own this resource' });
    return false;
  }
  return true;
}

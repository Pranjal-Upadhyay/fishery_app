/**
 * Admin Authentication Middleware
 *
 * Separate JWT verification surface for the dashboard. Uses ADMIN_JWT_SECRET,
 * which is intentionally distinct from JWT_SECRET (used by farmer/doctor auth).
 * This means a leaked farmer token can NEVER unlock admin routes — even if both
 * secrets share a hosting environment.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

if (!process.env.ADMIN_JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: ADMIN_JWT_SECRET environment variable is not set.');
}
const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || 'dev_only_admin_fallback_not_for_production';

export type AdminRole =
  | 'block_officer'
  | 'district_officer'
  | 'dlc_member'
  | 'superadmin';

export interface AdminAuthPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  assignedStateCodes: string[];
  assignedDistrictCodes: string[] | null;
  assignedBlockCodes: string[] | null;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminAuthPayload;
    }
  }
}

/**
 * Sign a JWT for an authenticated admin.
 * Token TTL is 8 hours — short enough to reduce risk, long enough for a workday.
 */
export function signAdminToken(payload: AdminAuthPayload): string {
  return jwt.sign(payload, ADMIN_JWT_SECRET, {
    expiresIn: '8h',
    issuer: 'matsyamitra-admin',
  });
}

/**
 * Require a valid admin JWT. Rejects with 401 otherwise.
 * Use this on every /api/v1/admin/* route except /login.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Admin authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminAuthPayload;
    if (!decoded.adminId || !decoded.role) {
      res.status(401).json({ success: false, error: 'Invalid admin token payload' });
      return;
    }
    req.admin = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ success: false, error: 'Admin session expired' });
      return;
    }
    logger.warn('Admin JWT verification failed', { error: err.message });
    res.status(401).json({ success: false, error: 'Invalid admin token' });
  }
}

/**
 * Restrict a route to one or more admin roles.
 * Must be used after requireAdmin.
 */
export function requireAdminRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({ success: false, error: 'Admin authentication required' });
      return;
    }
    if (!roles.includes(req.admin.role)) {
      res.status(403).json({ success: false, error: 'Insufficient admin permissions' });
      return;
    }
    next();
  };
}

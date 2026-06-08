/**
 * Admin Dashboard Routes
 * Mounted at /api/v1/admin
 *
 * Security posture:
 *   - Separate JWT secret from farmer/doctor auth (cannot be forged from those).
 *   - bcrypt(cost=12) password hashing — already enforced when seeding.
 *   - Account lockout: 5 consecutive failed attempts → 30-minute hard lock.
 *   - Audit trail records every successful AND failed authentication, with IP
 *     and user agent. Outcome column makes failures cheap to query.
 *   - Email enumeration prevention: identical error and timing for "no such
 *     user" and "wrong password".
 *   - Generic error messages on the wire; specific reasons only in audit log.
 *   - Locked-account responses use 423 so the UI can show a distinct message
 *     while the wire payload still leaks nothing.
 */

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { query } from '../db';
import { logger } from '../utils/logger';
import {
  requireAdmin,
  signAdminToken,
  AdminAuthPayload,
  AdminRole,
} from '../middleware/adminAuth';

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email().max(255),
  // Min 1 here — we don't enforce policy on submit (already-stored passwords
  // may predate a future rule). New password creation enforces a stronger
  // policy in a dedicated /admin/password endpoint (added in L3).
  password: z.string().min(1).max(128),
});

// ── Policy constants ────────────────────────────────────────────────────────

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

// Real bcrypt(cost=12) hash used when the email doesn't exist. Keeps
// per-request timing flat so an attacker can't probe valid emails by
// latency. Must be a VALID bcrypt hash — a bogus string makes
// bcrypt.compare return immediately, defeating the purpose. The plaintext
// behind this hash is intentionally one nobody will ever try to log in
// with; it's never used as a credential.
const DUMMY_HASH =
  '$2b$12$wEyMOABL2DexM5A0gHrJru7znqryN0WCza6thNzp2ldyyHE6b0kLu';

// ── DB row shape ─────────────────────────────────────────────────────────────

interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: AdminRole;
  assigned_state_codes: string[];
  assigned_district_codes: string[] | null;
  assigned_block_codes: string[] | null;
  is_active: boolean;
  failed_login_count: number;
  locked_until: string | null;
  must_change_password: boolean;
}

// ── Audit helper ─────────────────────────────────────────────────────────────

function auditInsert(
  adminUserId: string | null,
  action: string,
  outcome: 'success' | 'failure' | 'denied',
  metadata: Record<string, unknown>,
  ip: string | undefined,
  ua: string | null,
): void {
  query(
    `INSERT INTO admin_audit_log
       (admin_user_id, action, outcome, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [adminUserId, action, outcome, metadata, ip ?? null, ua ?? null],
  ).catch((err) =>
    logger.warn('admin_audit_log insert failed', { error: err.message }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/admin/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  const ip = req.ip;
  const ua = req.get('user-agent') ?? null;

  try {
    const { email: rawEmail, password } = loginSchema.parse(req.body);
    const email = rawEmail.toLowerCase();

    const result = await query<AdminUserRow>(
      `SELECT id, email, password_hash, full_name, role,
              assigned_state_codes, assigned_district_codes, assigned_block_codes,
              is_active, failed_login_count, locked_until, must_change_password
         FROM admin_users
         WHERE email = $1
         LIMIT 1`,
      [email],
    );

    const row = result.rows[0];

    // No such user — burn time matching a bcrypt compare so timing is flat.
    if (!row) {
      await bcrypt.compare(password, DUMMY_HASH).catch(() => false);
      auditInsert(null, 'login', 'failure', { reason: 'unknown_email', email }, ip, ua);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Deactivated account — treat as not-found.
    if (!row.is_active) {
      await bcrypt.compare(password, DUMMY_HASH).catch(() => false);
      auditInsert(row.id, 'login', 'denied', { reason: 'inactive' }, ip, ua);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // Lockout check — wall-clock comparison.
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
      auditInsert(row.id, 'login', 'denied', { reason: 'locked' }, ip, ua);
      res.status(423).json({ success: false, error: 'Account temporarily locked' });
      return;
    }

    const passwordOk = await bcrypt.compare(password, row.password_hash);

    if (!passwordOk) {
      const newCount = row.failed_login_count + 1;
      const willLock = newCount >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = willLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
        : null;

      await query(
        `UPDATE admin_users
            SET failed_login_count   = $1,
                last_failed_login_at = NOW(),
                locked_until         = $2
          WHERE id = $3`,
        [newCount, lockedUntil, row.id],
      );

      auditInsert(
        row.id,
        'login',
        'failure',
        { reason: 'bad_password', failed_count: newCount, locked: willLock },
        ip,
        ua,
      );

      // Same generic message whether or not we just locked the account —
      // the lockout becomes visible only on the *next* attempt, via 423.
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    // ── Success ─────────────────────────────────────────────────────────────
    await query(
      `UPDATE admin_users
          SET failed_login_count = 0,
              locked_until       = NULL,
              last_login_at      = NOW()
        WHERE id = $1`,
      [row.id],
    );

    const payload: AdminAuthPayload = {
      adminId: row.id,
      email: row.email,
      role: row.role,
      assignedStateCodes: row.assigned_state_codes,
      assignedDistrictCodes: row.assigned_district_codes,
      assignedBlockCodes: row.assigned_block_codes,
    };
    const token = signAdminToken(payload);

    auditInsert(row.id, 'login', 'success', {}, ip, ua);

    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: row.id,
          email: row.email,
          fullName: row.full_name,
          role: row.role,
          assignedStateCodes: row.assigned_state_codes,
          assignedDistrictCodes: row.assigned_district_codes,
          assignedBlockCodes: row.assigned_block_codes,
          mustChangePassword: row.must_change_password,
        },
      },
    });
  } catch (err: any) {
    if (err.errors) {
      // Don't leak which field failed; just reject the whole thing.
      auditInsert(null, 'login', 'failure', { reason: 'validation' }, ip, ua);
      res.status(400).json({ success: false, error: 'Invalid request' });
      return;
    }
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/me
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', requireAdmin, async (req, res, next) => {
  try {
    const adminId = req.admin!.adminId;
    const result = await query<AdminUserRow>(
      `SELECT id, email, full_name, role,
              assigned_state_codes, assigned_district_codes, assigned_block_codes,
              is_active, failed_login_count, locked_until, must_change_password
         FROM admin_users
         WHERE id = $1 AND is_active = TRUE
         LIMIT 1`,
      [adminId],
    );

    const row = result.rows[0];
    if (!row) {
      res.status(404).json({ success: false, error: 'Admin account no longer active' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        assignedStateCodes: row.assigned_state_codes,
        assignedDistrictCodes: row.assigned_district_codes,
        assignedBlockCodes: row.assigned_block_codes,
        mustChangePassword: row.must_change_password,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as adminRouter };

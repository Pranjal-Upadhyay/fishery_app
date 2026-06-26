/**
 * Admin Dashboard Routes
 * Mounted at /api/v1/admin
 *
 * Security posture:
 *   - Separate JWT secret from farmer/doctor auth (cannot be forged from those).
 *   - bcrypt(cost=10) password hashing — already enforced when seeding.
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

// Real bcrypt(cost=10) hash used when the email doesn't exist. Keeps
// per-request timing flat so an attacker can't probe valid emails by
// latency. Must be a VALID bcrypt hash — a bogus string makes
// bcrypt.compare return immediately, defeating the purpose. The plaintext
// behind this hash is intentionally one nobody will ever try to log in
// with; it's never used as a credential.
const DUMMY_HASH =
  '$2b$10$9bF5j81aA5ENeLMoy.uZJOaAvmYt.KBE4cx4Mi.1owDW3us0davUi';

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

// Helper function to format district names to Title Case for frontend map lookup
function toTitleCase(str: string | null | undefined): string {
  if (!str) return 'Unknown';
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Purbi/g, 'Purbi')
    .replace(/Pashchimi/g, 'Pashchimi');
}

// Helper function to format system type names to match frontend display expectations
function formatSystemType(sys: string | null | undefined): string {
  if (!sys) return 'Earthen';
  const upper = sys.toUpperCase();
  if (upper === 'EXTENSIVE' || upper === 'SEMI_INTENSIVE' || upper === 'EARTHEN') return 'Earthen';
  if (upper === 'INTENSIVE' || upper === 'BIOFLOC') return 'Biofloc';
  if (upper === 'RAS') return 'RAS';
  if (upper === 'CAGES') return 'Cages';
  return toTitleCase(sys);
}

// Helper function to format pond activity type to match PondMapItem type
function formatPondActivity(act: string | null | undefined): 'GROW_OUT' | 'HATCHERY' | 'NURSERY' | 'BROODSTOCK' {
  if (!act) return 'GROW_OUT';
  const upper = act.toUpperCase();
  if (upper === 'NURSERY') return 'NURSERY';
  if (upper === 'BROODSTOCK') return 'BROODSTOCK';
  if (upper === 'GROW_OUT' || upper === 'MIXED') return 'GROW_OUT';
  return 'GROW_OUT';
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/atlas-items
// ─────────────────────────────────────────────────────────────────────────────
router.get('/atlas-items', requireAdmin, async (req, res, next) => {
  try {
    // Fetch ponds, hatcheries, and BAIP Geotagged Farmers in parallel
    const [pondsRes, hatcheriesRes, baipRes] = await Promise.all([
      query(`
        SELECT 
          p.id,
          p.name,
          u.name AS farmer_name,
          ST_Y(p.location::geometry) AS lat,
          ST_X(p.location::geometry) AS lng,
          p.pond_activity_type,
          d.name AS district_name,
          k.data->>'label' AS species_label,
          p.system_type,
          p.ownership_type,
          p.water_source_type,
          p.area_hectares,
          p.wide_angle_photo_uri, p.embankment_photo_uri, p.close_view_photo_uri, p.farmer_with_pond_photo_uri,
          p.disease_occurrence
        FROM ponds p
        LEFT JOIN users u ON u.id = p.user_id
        LEFT JOIN loc_districts d ON d.code = p.district_code
        LEFT JOIN knowledge_nodes k ON k.id = p.species_id
      `),
      query(`
        SELECT 
          h.id,
          h.name,
          u.name AS farmer_name,
          h.latitude AS lat,
          h.longitude AS lng,
          COALESCE(h.district, 'Unknown') AS district,
          h.capacity_kg,
          h.disease_occurrence
        FROM hatcheries h
        LEFT JOIN users u ON u.id = h.operator_id
      `),
      query(`
        SELECT 
          id::text,
          farmer_name || ' (BAIP Hatchery)' AS name,
          farmer_name,
          latitude AS lat,
          longitude AS lng,
          COALESCE(district, 'Unknown') AS district,
          disease_occurrence
        FROM baip_geotagged_farmers
      `)
    ]);

    const allItems: any[] = [];

    // Map Ponds
    pondsRes.rows.forEach((row: any) => {
      const latVal = parseFloat(String(row.lat));
      const lonVal = parseFloat(String(row.lng));
      if (isNaN(latVal) || isNaN(lonVal)) return;

      const isCritical = row.disease_occurrence === 'major' || row.disease_occurrence === 'critical';

      allItems.push({
        id: row.id,
        name: row.name,
        farmerName: row.farmer_name || 'Unknown Farmer',
        lat: latVal,
        lng: lonVal,
        type: formatPondActivity(row.pond_activity_type),
        alertStatus: isCritical ? 'critical' : 'normal',
        district: toTitleCase(row.district_name),
        species: row.species_label || 'Standard Rohu',
        system: formatSystemType(row.system_type),
        ownerType: row.ownership_type || 'OWNED',
        waterSource: row.water_source_type || 'PERENNIAL',
        areaHectares: parseFloat(String(row.area_hectares || 1.0)),
        photos: [
          row.wide_angle_photo_uri,
          row.embankment_photo_uri,
          row.close_view_photo_uri,
          row.farmer_with_pond_photo_uri
        ].filter(Boolean),
        alertReason: isCritical ? 'Critical: Major disease outbreak reported' : undefined,
      });
    });

    // Map Hatcheries
    hatcheriesRes.rows.forEach((row: any) => {
      const latVal = parseFloat(String(row.lat));
      const lonVal = parseFloat(String(row.lng));
      if (isNaN(latVal) || isNaN(lonVal)) return;

      const isCritical = row.disease_occurrence === 'major' || row.disease_occurrence === 'critical';

      allItems.push({
        id: row.id,
        name: row.name,
        farmerName: row.farmer_name || 'Unknown Operator',
        lat: latVal,
        lng: lonVal,
        type: 'HATCHERY',
        alertStatus: isCritical ? 'critical' : 'normal',
        district: toTitleCase(row.district),
        species: 'Jayanti Rohu',
        system: 'Earthen',
        ownerType: 'OWNED',
        waterSource: 'PERENNIAL',
        areaHectares: parseFloat(String(row.capacity_kg ? row.capacity_kg / 1000.0 : 1.0)),
        photos: [],
        alertReason: isCritical ? 'Critical: Major disease outbreak reported' : undefined,
      });
    });

    // Map BAIP Hatcheries
    baipRes.rows.forEach((row: any) => {
      const latVal = parseFloat(String(row.lat));
      const lonVal = parseFloat(String(row.lng));
      if (isNaN(latVal) || isNaN(lonVal)) return;

      const isCritical = row.disease_occurrence === 'major' || row.disease_occurrence === 'critical';

      allItems.push({
        id: row.id,
        name: row.name,
        farmerName: row.farmer_name,
        lat: latVal,
        lng: lonVal,
        type: 'HATCHERY',
        alertStatus: isCritical ? 'critical' : 'normal',
        district: toTitleCase(row.district),
        species: 'Jayanti Rohu',
        system: 'Earthen',
        ownerType: 'OWNED',
        waterSource: 'PERENNIAL',
        areaHectares: 1.5,
        photos: [],
        alertReason: isCritical ? 'Critical: Major disease outbreak reported' : undefined,
      });
    });

    res.json({ success: true, data: allItems });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/marketplace/listings
// ─────────────────────────────────────────────────────────────────────────────
router.get('/marketplace/listings', requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        fl.id,
        fl.hatchery_id,
        fl.batch_id,
        fl.stage,
        fl.species_name,
        fl.species_variant,
        fl.description,
        fl.total_quantity,
        fl.quantity_available,
        fl.reserved_quantity,
        fl.confirmed_quantity,
        fl.min_order_qty,
        fl.price_per_piece,
        fl.bulk_price_per_piece,
        fl.bulk_price_threshold,
        fl.expected_ready_date,
        fl.last_available_date,
        fl.status,
        fl.pickup_available,
        fl.delivery_available,
        h.name AS hatchery_name,
        h.district AS hatchery_district
      FROM fingerling_listings fl
      JOIN hatcheries h ON h.id = fl.hatchery_id
      ORDER BY fl.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/marketplace/orders
// ─────────────────────────────────────────────────────────────────────────────
router.get('/marketplace/orders', requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 
        fo.id,
        fo.listing_id,
        fo.farmer_id,
        fo.farmer_uid,
        fo.quantity_ordered,
        fo.price_per_piece,
        fo.total_amount,
        fo.status,
        fo.order_type,
        fo.farmer_notes,
        fo.delivery_address,
        fo.payment_screenshot_url,
        fo.rejection_reason,
        fo.dispute_reason,
        fo.dispute_description,
        fo.disputed_at,
        fo.dispute_resolved_at,
        fo.created_at,
        fo.accepted_at,
        fo.rejected_at,
        fo.fulfilled_at,
        fo.cancelled_at,
        u.name AS farmer_name,
        u.phone_number AS farmer_phone,
        fl.species_name,
        fl.species_variant,
        fl.stage,
        h.name AS hatchery_name,
        h.contact_number AS hatchery_phone
      FROM fingerling_orders fo
      JOIN users u ON u.id = fo.farmer_id
      JOIN fingerling_listings fl ON fl.id = fo.listing_id
      JOIN hatcheries h ON h.id = fl.hatchery_id
      ORDER BY fo.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

export { router as adminRouter };

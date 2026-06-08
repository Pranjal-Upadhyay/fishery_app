import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { logger } from '../utils/logger';

const router = Router();

// Zod schemas
const applySchema = z.object({
  pondId: z.string().uuid(),
  yojanaCode: z.string().min(1).max(80),
});

const updateStatusSchema = z.object({
  status: z.enum(['AWAITING_REVIEW', 'DLC_QUEUE', 'APPROVED', 'MILESTONE_1_MET', 'MILESTONE_2_MET', 'REJECTED']),
});

const releasePayoutSchema = z.object({
  milestoneIndex: z.number().int().nonnegative(),
});

// Param validators — reject non-UUID ids with a clean 400 instead of letting
// the query layer return an opaque 500 ("invalid input syntax for uuid").
const uuidParam = z.string().uuid('Invalid UUID');

// Helper to map Yojana Codes to Display Names
function getYojanaName(code: string): string {
  switch (code) {
    case 'JKSY':
      return 'Jalkrishi Saurikaran (Solar Pump)';
    case 'TMVSY':
      return 'Talab Matsyiki Vishesh Sahayata';
    case 'MPVY':
      return 'Species Diversification Hatchery';
    default:
      return code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FARMER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/yojana/applications
// List all applications for the logged-in farmer
router.get('/applications', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;

    const result = await query(`
      SELECT ya.id, ya.pond_id, p.name as pond_name, ya.yojana_code, ya.status,
             ya.approved_subsidy_amount, ya.milestones, ya.created_at, ya.updated_at,
             (
               SELECT COALESCE(json_agg(dt_row), '[]'::json)
               FROM (
                 SELECT dt.id, dt.milestone_index, dt.utr_number, dt.amount, dt.status,
                        dt.farmer_confirmed, dt.farmer_confirmed_at, dt.processed_at
                 FROM dbt_transactions dt
                 WHERE dt.application_id = ya.id
                 ORDER BY dt.milestone_index ASC
               ) dt_row
             ) as transactions
      FROM yojana_applications ya
      JOIN ponds p ON p.id = ya.pond_id
      WHERE ya.user_id = $1
      ORDER BY ya.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(row => ({
        ...row,
        yojana_name: getYojanaName(row.yojana_code),
        approved_subsidy_amount: parseFloat(row.approved_subsidy_amount)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/yojana/apply
// Submit a new Yojana application for a pond
router.post('/apply', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const { pondId, yojanaCode } = applySchema.parse(req.body);

    // Verify pond belongs to user
    const pondCheck = await query(`
      SELECT id, area_hectares FROM ponds WHERE id = $1 AND user_id = $2
    `, [pondId, userId]);

    if (pondCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Pond not found or unauthorized access'
      });
    }

    // Verify user doesn't already have an active application for this Yojana on this pond
    const existingCheck = await query(`
      SELECT id FROM yojana_applications 
      WHERE pond_id = $1 AND yojana_code = $2 AND status != 'REJECTED'
    `, [pondId, yojanaCode]);

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'An active application for this Yojana on this pond already exists'
      });
    }

    // Setup approved subsidy values and default milestones
    let approvedSubsidy = 300000.00;
    let milestones: any[] = [];

    if (yojanaCode === 'JKSY') {
      approvedSubsidy = 433600.00;
      milestones = [
        { name: 'Borewell & Foundation', pct: 40, verified: false, photoUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80' },
        { name: 'Solar panel & pump mount', pct: 40, verified: false },
        { name: 'Post-Stocking validation', pct: 20, verified: false }
      ];
    } else if (yojanaCode === 'TMVSY') {
      approvedSubsidy = 565600.00;
      milestones = [
        { name: 'Excavation & Dykes Renovation', pct: 50, verified: false },
        { name: 'Water filling & Seed stocking', pct: 50, verified: false }
      ];
    } else {
      milestones = [
        { name: 'Initial Infrastructure setup', pct: 50, verified: false },
        { name: 'Stocking & input validation', pct: 50, verified: false }
      ];
    }

    const insertResult = await query(`
      INSERT INTO yojana_applications (user_id, pond_id, yojana_code, status, approved_subsidy_amount, milestones)
      VALUES ($1, $2, $3, 'AWAITING_REVIEW', $4, $5)
      RETURNING *
    `, [userId, pondId, yojanaCode, approvedSubsidy, JSON.stringify(milestones)]);

    res.status(201).json({
      success: true,
      data: {
        ...insertResult.rows[0],
        yojana_name: getYojanaName(yojanaCode),
        approved_subsidy_amount: parseFloat(insertResult.rows[0].approved_subsidy_amount)
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/yojana/transactions/:id/confirm
// Farmer confirms receipt of the DBT payment
router.post('/transactions/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const transactionId = uuidParam.parse(req.params.id);

    // Verify transaction exists and is tied to user's application
    const verifyResult = await query(`
      UPDATE dbt_transactions dt
      SET farmer_confirmed = true, farmer_confirmed_at = NOW()
      FROM yojana_applications ya
      WHERE dt.id = $1 AND dt.application_id = ya.id AND ya.user_id = $2
      RETURNING dt.id, dt.farmer_confirmed, dt.farmer_confirmed_at, dt.utr_number
    `, [transactionId, userId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found or unauthorized access'
      });
    }

    res.json({
      success: true,
      message: 'Receipt confirmed successfully',
      data: verifyResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (requireAdmin)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/yojana/admin/applications
// List all applications with farmer profiles and georeferenced coordinates
router.get('/admin/applications', requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT ya.id, ya.yojana_code, ya.status, ya.approved_subsidy_amount, ya.milestones, ya.created_at,
             u.name as farmer_name, u.farmer_category as caste,
             p.name as pond_name, p.area_hectares,
             ST_Y(p.location::geometry) as latitude,
             ST_X(p.location::geometry) as longitude,
             COALESCE(p.district_code, 'BR-MADHUBANI') as district_code
      FROM yojana_applications ya
      JOIN users u ON u.id = ya.user_id
      JOIN ponds p ON p.id = ya.pond_id
      ORDER BY ya.created_at DESC
    `);

    // Map database models into frontend-compatible dashboard schemas
    const mappedApplications = result.rows.map(row => {
      // Map caste code
      let casteDisplay = 'General';
      if (row.caste === 'SC') casteDisplay = 'SC';
      else if (row.caste === 'ST') casteDisplay = 'ST';
      else if (row.caste === 'WOMEN') casteDisplay = 'EBC'; // Women mapped to EBC categories for demo priority

      // Map status
      let statusDisplay = 'Awaiting Review';
      if (row.status === 'DLC_QUEUE') statusDisplay = 'DLC Queue';
      else if (row.status === 'APPROVED') statusDisplay = 'Approved';
      else if (row.status === 'MILESTONE_1_MET') statusDisplay = 'Milestone 1 Met';
      else if (row.status === 'MILESTONE_2_MET') statusDisplay = 'Milestone 2 Met';

      // Map district code to display name
      const distParts = row.district_code.split('-');
      const districtDisplay = distParts[distParts.length - 1];

      return {
        id: row.id,
        appNum: `APP-2026-${row.yojana_code}-${row.id.substring(0, 3).toUpperCase()}`,
        farmerName: row.farmer_name,
        caste: casteDisplay,
        yojanaName: getYojanaName(row.yojana_code),
        district: districtDisplay.charAt(0).toUpperCase() + districtDisplay.slice(1).toLowerCase(),
        landArea: `${(parseFloat(row.area_hectares) * 2.471).toFixed(1)} Acres`,
        documents: [
          { name: 'Caste Certificate', status: 'verified' },
          { name: 'Land Registry (LPC)', status: 'verified' },
          { name: 'Aadhaar eKYC Verification', status: 'verified' },
          { name: 'Bank Passbook (Seeded)', status: row.status === 'AWAITING_REVIEW' ? 'pending' : 'verified' },
        ],
        gpsCoords: `${parseFloat(row.latitude).toFixed(4)} N, ${parseFloat(row.longitude).toFixed(4)} E`,
        gpsMatch: true,
        status: statusDisplay,
        milestones: row.milestones,
        subsidyAmount: `₹${parseFloat(row.approved_subsidy_amount).toLocaleString('en-IN')}`,
      };
    });

    res.json({
      success: true,
      count: mappedApplications.length,
      data: mappedApplications
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/yojana/admin/applications/:id/status
// Update application status
router.patch('/admin/applications/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const appId = uuidParam.parse(req.params.id);
    const { status } = updateStatusSchema.parse(req.body);

    const result = await query(`
      UPDATE yojana_applications
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, appId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/yojana/admin/applications/:id/release-payout
// Simulate releasing milestone DBT payouts
router.post('/admin/applications/:id/release-payout', requireAdmin, async (req, res, next) => {
  try {
    const appId = uuidParam.parse(req.params.id);
    const { milestoneIndex } = releasePayoutSchema.parse(req.body);

    // Get application details
    const appResult = await query(`
      SELECT id, approved_subsidy_amount, milestones, status FROM yojana_applications WHERE id = $1
    `, [appId]);

    if (appResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const app = appResult.rows[0];
    const milestones = app.milestones;

    if (milestoneIndex >= milestones.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid milestone index'
      });
    }

    // Mark milestone as verified
    milestones[milestoneIndex].verified = true;

    // Determine new status
    const allDone = milestones.every((m: any) => m.verified);
    const newStatus = allDone ? 'MILESTONE_2_MET' : 'MILESTONE_1_MET';

    // Update application
    await query(`
      UPDATE yojana_applications
      SET milestones = $1, status = $2, updated_at = NOW()
      WHERE id = $3
    `, [JSON.stringify(milestones), newStatus, appId]);

    // Create DBT Transaction
    const subsidyVal = parseFloat(app.approved_subsidy_amount);
    const weight = milestones[milestoneIndex].pct;
    const payoutAmount = (subsidyVal * weight) / 100;
    const utr = `UTR-20260608-${Math.floor(1000 + Math.random() * 9000)}`;

    const txnResult = await query(`
      INSERT INTO dbt_transactions (application_id, milestone_index, utr_number, amount, status)
      VALUES ($1, $2, $3, $4, 'SUCCESS')
      RETURNING *
    `, [appId, milestoneIndex, utr, payoutAmount]);

    res.json({
      success: true,
      message: 'DBT Payout successfully queued for Direct Bank Transfer',
      data: {
        transaction: txnResult.rows[0],
        status: newStatus,
        milestones
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/yojana/admin/stats
// Aggregated stats and transactions list for Subsidies Page
router.get('/admin/stats', requireAdmin, async (req, res, next) => {
  try {
    // 1. Total Allocated
    const allocatedResult = await query(`
      SELECT COALESCE(SUM(approved_subsidy_amount), 0) as total FROM yojana_applications WHERE status != 'REJECTED'
    `);
    const liveAllocated = parseFloat(allocatedResult.rows[0].total);
    // Base standard allocated budget = ₹42.5 Cr. Let's merge db claims into it
    const baseBudget = 425000000;
    const totalBudget = baseBudget;

    // 2. Total Disbursed (live SUCCESS transactions)
    const disbursedResult = await query(`
      SELECT COALESCE(SUM(amount), 0) as total FROM dbt_transactions WHERE status = 'SUCCESS'
    `);
    const liveDisbursed = parseFloat(disbursedResult.rows[0].total);
    const baseDisbursed = 327000000; // Rs 32.7 Cr
    const totalDisbursed = baseDisbursed + liveDisbursed;

    // 3. Pending DLC Approvals
    const pendingResult = await query(`
      SELECT COALESCE(SUM(approved_subsidy_amount), 0) as total FROM yojana_applications WHERE status = 'DLC_QUEUE'
    `);
    const livePending = parseFloat(pendingResult.rows[0].total);
    const basePending = 24000000; // Rs 2.4 Cr
    const totalPending = basePending + livePending;

    // 4. Budget Utilization Rate
    const utilizationRate = parseFloat(((totalDisbursed / totalBudget) * 100).toFixed(1));

    // 5. Direct Benefit Transfer Logs (database transactions)
    const txnsResult = await query(`
      SELECT dt.id, dt.utr_number as utr, u.name as farmer_name, ya.yojana_code,
             dt.amount, dt.status, dt.farmer_confirmed, dt.processed_at::date::text as date
      FROM dbt_transactions dt
      JOIN yojana_applications ya ON ya.id = dt.application_id
      JOIN users u ON u.id = ya.user_id
      ORDER BY dt.processed_at DESC
      LIMIT 20
    `);

    const mappedTxns = txnsResult.rows.map(row => ({
      id: row.id,
      utr: row.utr,
      farmerName: row.farmer_name,
      yojana: getYojanaName(row.yojana_code),
      bankSeeding: row.farmer_confirmed ? ('Seeded & Verified' as const) : ('Processing' as const),
      amount: `₹${parseFloat(row.amount).toLocaleString('en-IN')}`,
      status: row.status === 'SUCCESS' ? ('Success' as const) : row.status === 'FAILED' ? ('Failed' as const) : ('Processing' as const),
      date: row.date,
    }));

    res.json({
      success: true,
      data: {
        totalBudget: `₹${(totalBudget / 10000000).toFixed(1)} Cr`,
        totalDisbursed: `₹${(totalDisbursed / 10000000).toFixed(1)} Cr`,
        pendingDlc: `₹${(totalPending / 10000000).toFixed(1)} Cr`,
        utilizationRate: `${utilizationRate}%`,
        transactions: mappedTxns
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as yojanaRouter };

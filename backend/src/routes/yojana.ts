import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { logger } from '../utils/logger';
import { SupabaseService } from '../services/supabaseService';

const router = Router();

// Zod schemas
const applySchema = z.object({
  pondId: z.string().uuid(),
  yojanaCode: z.string().min(1).max(80),
  applicantName: z.string().min(2).max(200),
  applicantDistrict: z.string().min(2).max(100),
  applicantCategory: z.string().min(2).max(20),
  applicantLandArea: z.number().positive(),
  projectDescription: z.string().optional(),
  documents: z.array(
    z.object({
      docType: z.string(),
      filePath: z.string(),
      fileName: z.string(),
      mimeType: z.string().optional(),
    })
  ).min(1),
});

const editSchema = z.object({
  applicantName: z.string().min(2).max(200).optional(),
  applicantDistrict: z.string().min(2).max(100).optional(),
  applicantCategory: z.string().min(2).max(20).optional(),
  applicantLandArea: z.number().positive().optional(),
  projectDescription: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['AWAITING_REVIEW', 'DLC_QUEUE', 'APPROVED', 'MILESTONE_1_MET', 'MILESTONE_2_MET', 'REJECTED']),
});

const releasePayoutSchema = z.object({
  milestoneIndex: z.number().int().nonnegative(),
});

const docVerifySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  rejectionReason: z.string().max(500).optional(),
});

const appRejectSchema = z.object({
  rejectionReason: z.string().min(10).max(500),
});

const schemeSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric'),
  nameEn: z.string().min(3).max(150),
  nameHi: z.string().min(3).max(150),
  tagline: z.string().max(250).optional().nullable(),
  description: z.string().optional().nullable(),
  subsidyByCategory: z.object({
    general: z.number().min(0).max(100),
    ebc: z.number().min(0).max(100),
    sc: z.number().min(0).max(100),
    st: z.number().min(0).max(100)
  }),
  unitCostCapLakh: z.number().positive(),
  maxSubsidyLakh: z.number().positive(),
  eligibility: z.array(z.string()),
  requiredDocuments: z.array(z.string()),
  geofence: z.string().max(150).optional().nullable(),
  classification: z.string().max(80).optional().nullable(),
  accentColor: z.string().max(30).optional().default('teal'),
  milestones: z.array(
    z.object({
      name: z.string().min(2),
      pct: z.number().min(1).max(100)
    })
  ).min(1),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional().default('ACTIVE')
});

const schemeUpdateSchema = schemeSchema.omit({ code: true }).extend({
  changeSummary: z.string().min(10).max(500)
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

// ── MOCK STORAGE UPLOAD ROUTE (dev only) ────────────────────────────────────
router.put('/mock-upload', async (req, res) => {
  logger.info(`[Storage Mock] Received file upload for path: ${req.query.path}`);
  res.json({ success: true, message: 'Mock upload successful' });
});

// ─────────────────────────────────────────────────────────────────────────────
// FARMER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/yojana/upload-token
// Generates a signed Supabase upload URL for the farmer
router.get('/upload-token', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const docType = z.string().parse(req.query.docType);
    const fileName = z.string().parse(req.query.fileName);
    
    const ext = fileName.split('.').pop() || 'pdf';
    const timestamp = Date.now();
    const filePath = `${userId}/${docType}_${timestamp}.${ext}`;
    
    const result = await SupabaseService.getSignedUploadUrl(filePath);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/yojana/applications
// List all applications for the logged-in farmer
router.get('/applications', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;

    const result = await query(`
      SELECT ya.id, ya.pond_id, p.name as pond_name, ya.yojana_code, ya.status,
             ya.approved_subsidy_amount, ya.milestones, ya.created_at, ya.updated_at,
             ya.applicant_name, ya.applicant_district, ya.applicant_category,
             ya.applicant_land_area, ya.project_description, ya.rejection_reason as application_rejection_reason,
             COALESCE(p.district_code, 'BR-MADHUBANI') as district_code,
             ys.name_en AS db_yojana_name,
             (
               SELECT COALESCE(json_agg(dt_row), '[]'::json)
               FROM (
                 SELECT dt.id, dt.milestone_index, dt.utr_number, dt.amount, dt.status,
                        dt.farmer_confirmed, dt.farmer_confirmed_at, dt.processed_at
                 FROM dbt_transactions dt
                 WHERE dt.application_id = ya.id
                 ORDER BY dt.milestone_index ASC
               ) dt_row
             ) as transactions,
             (
               SELECT COALESCE(json_agg(doc_row), '[]'::json)
               FROM (
                 SELECT ad.id, ad.doc_type, ad.file_path, ad.file_name, ad.mime_type,
                        ad.verification_status, ad.rejection_reason
                 FROM application_documents ad
                 WHERE ad.application_id = ya.id
               ) doc_row
             ) as documents
      FROM yojana_applications ya
      JOIN ponds p ON p.id = ya.pond_id
      LEFT JOIN yojana_schemes ys ON ys.code = ya.yojana_code
      WHERE ya.user_id = $1
      ORDER BY ya.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(row => ({
        ...row,
        yojana_name: row.db_yojana_name || row.yojana_code,
        approved_subsidy_amount: parseFloat(row.approved_subsidy_amount),
        applicant_land_area: parseFloat(row.applicant_land_area || '0')
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
    const {
      pondId,
      yojanaCode,
      applicantName,
      applicantDistrict,
      applicantCategory,
      applicantLandArea,
      projectDescription,
      documents
    } = applySchema.parse(req.body);

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

    // Setup approved subsidy values and default milestones dynamically from DB
    const schemeCheck = await query(`
      SELECT max_subsidy_lakh, milestones FROM yojana_schemes WHERE code = $1 AND status = 'ACTIVE'
    `, [yojanaCode]);

    if (schemeCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'The requested scheme does not exist or has been discontinued.'
      });
    }

    const dbScheme = schemeCheck.rows[0];
    const approvedSubsidy = parseFloat(dbScheme.max_subsidy_lakh) * 100000;
    const milestones = dbScheme.milestones.map((m: any) => ({
      name: m.name,
      pct: m.pct,
      verified: false
    }));

    // Insert Yojana application
    const insertResult = await query(`
      INSERT INTO yojana_applications (
        user_id, pond_id, yojana_code, status, approved_subsidy_amount, milestones,
        applicant_name, applicant_district, applicant_category, applicant_land_area,
        project_description, form_submitted_at
      )
      VALUES ($1, $2, $3, 'AWAITING_REVIEW', $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `, [
      userId, pondId, yojanaCode, approvedSubsidy, JSON.stringify(milestones),
      applicantName, applicantDistrict, applicantCategory, applicantLandArea,
      projectDescription
    ]);

    const application = insertResult.rows[0];

    // Insert associated documents
    for (const doc of documents) {
      await query(`
        INSERT INTO application_documents (
          application_id, doc_type, file_path, file_name, mime_type, verification_status
        )
        VALUES ($1, $2, $3, $4, $5, 'PENDING')
      `, [application.id, doc.docType, doc.filePath, doc.fileName, doc.mimeType || 'application/pdf']);
    }

    res.status(201).json({
      success: true,
      data: {
        ...application,
        yojana_name: getYojanaName(yojanaCode),
        approved_subsidy_amount: parseFloat(application.approved_subsidy_amount)
      }
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/yojana/applications/:id/edit
// Edit application form fields (only in AWAITING_REVIEW status)
router.patch('/applications/:id/edit', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const appId = uuidParam.parse(req.params.id);
    const updates = editSchema.parse(req.body);

    // Verify application exists, belongs to farmer, and is in AWAITING_REVIEW status
    const appCheck = await query(`
      SELECT id, status FROM yojana_applications WHERE id = $1 AND user_id = $2
    `, [appId, userId]);

    if (appCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or unauthorized access'
      });
    }

    const app = appCheck.rows[0];
    if (app.status !== 'AWAITING_REVIEW') {
      return res.status(400).json({
        success: false,
        error: 'Application cannot be edited once it has passed document review.'
      });
    }

    // Dynamic field update query
    const setFields: string[] = [];
    const values: any[] = [];
    let valIdx = 1;

    Object.entries(updates).forEach(([key, val]) => {
      const dbCol = 
        key === 'applicantName' ? 'applicant_name' :
        key === 'applicantDistrict' ? 'applicant_district' :
        key === 'applicantCategory' ? 'applicant_category' :
        key === 'applicantLandArea' ? 'applicant_land_area' :
        key === 'projectDescription' ? 'project_description' : null;

      if (dbCol && val !== undefined) {
        setFields.push(`${dbCol} = $${valIdx}`);
        values.push(val);
        valIdx++;
      }
    });

    if (setFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    // Add ID and last edited timestamp
    setFields.push(`last_edited_at = NOW()`);
    values.push(appId);
    
    const updateResult = await query(`
      UPDATE yojana_applications
      SET ${setFields.join(', ')}
      WHERE id = $${valIdx}
      RETURNING *
    `, values);

    res.json({
      success: true,
      data: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/yojana/applications/:id/reupload
// Re-upload a single rejected document (deletes old storage file + updates DB row)
router.post('/applications/:id/reupload', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const appId = uuidParam.parse(req.params.id);
    const { docType, filePath, fileName, mimeType } = z.object({
      docType: z.string(),
      filePath: z.string(),
      fileName: z.string(),
      mimeType: z.string().optional(),
    }).parse(req.body);

    // Verify application status is before APPROVED
    const appCheck = await query(`
      SELECT status FROM yojana_applications WHERE id = $1 AND user_id = $2
    `, [appId, userId]);

    if (appCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    if (appCheck.rows[0].status === 'APPROVED' || appCheck.rows[0].status === 'MILESTONE_1_MET' || appCheck.rows[0].status === 'MILESTONE_2_MET') {
      return res.status(400).json({ success: false, error: 'Cannot reupload documents once application is approved.' });
    }

    // Check if document already exists
    const docCheck = await query(`
      SELECT file_path FROM application_documents WHERE application_id = $1 AND doc_type = $2
    `, [appId, docType]);

    if (docCheck.rows.length > 0) {
      const oldPath = docCheck.rows[0].file_path;
      // Delete old file from Supabase storage
      await SupabaseService.deleteFile(oldPath);
    }

    // Upsert document record
    const result = await query(`
      INSERT INTO application_documents (application_id, doc_type, file_path, file_name, mime_type, verification_status, rejection_reason)
      VALUES ($1, $2, $3, $4, $5, 'PENDING', NULL)
      ON CONFLICT (application_id, doc_type)
      DO UPDATE SET 
        file_path = EXCLUDED.file_path,
        file_name = EXCLUDED.file_name,
        mime_type = EXCLUDED.mime_type,
        verification_status = 'PENDING',
        rejection_reason = NULL,
        verified_by_admin = NULL,
        verified_at = NULL
      RETURNING *
    `, [appId, docType, filePath, fileName, mimeType || 'application/pdf']);

    res.json({
      success: true,
      data: result.rows[0]
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
// List applications with pagination, search, and geographical filtering
router.get('/admin/applications', requireAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '25', 10);
    const offset = (page - 1) * limit;

    const search = req.query.search as string || '';
    const districtCode = req.query.districtCode as string || '';
    const blockCode = req.query.blockCode as string || '';
    const panchayatCode = req.query.panchayatCode as string || '';
    const status = req.query.status as string || '';
    const yojanaCode = req.query.yojanaCode as string || '';

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(ya.applicant_name ILIKE $${params.length} OR u.name ILIKE $${params.length} OR ya.id::text ILIKE $${params.length})`);
    }
    if (districtCode) {
      params.push(districtCode);
      conditions.push(`p.district_code = $${params.length}`);
    }
    if (blockCode) {
      params.push(blockCode);
      conditions.push(`p.block_code = $${params.length}`);
    }
    if (panchayatCode) {
      params.push(panchayatCode);
      conditions.push(`p.panchayat_code = $${params.length}`);
    }
    if (status) {
      let dbStatus = status;
      if (status === 'Awaiting Review') dbStatus = 'AWAITING_REVIEW';
      else if (status === 'DLC Queue') dbStatus = 'DLC_QUEUE';
      else if (status === 'Approved') dbStatus = 'APPROVED';
      else if (status === 'Milestone 1 Met') dbStatus = 'MILESTONE_1_MET';
      else if (status === 'Milestone 2 Met') dbStatus = 'MILESTONE_2_MET';
      else if (status === 'Rejected') dbStatus = 'REJECTED';
      params.push(dbStatus);
      conditions.push(`ya.status = $${params.length}`);
    }
    if (yojanaCode) {
      params.push(yojanaCode);
      conditions.push(`ya.yojana_code = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`
      SELECT COUNT(*) as count
      FROM yojana_applications ya
      JOIN users u ON u.id = ya.user_id
      JOIN ponds p ON p.id = ya.pond_id
      ${whereClause}
    `, params);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const paginatedParams = [...params];
    paginatedParams.push(limit);
    const limitParamIndex = paginatedParams.length;
    paginatedParams.push(offset);
    const offsetParamIndex = paginatedParams.length;

    const result = await query(`
      SELECT ya.id, ya.yojana_code, ya.status, ya.approved_subsidy_amount, ya.milestones, ya.created_at,
             ya.applicant_name, ya.applicant_district, ya.applicant_category, ya.applicant_land_area,
             ya.project_description, ya.rejection_reason as application_rejection_reason,
             u.name as farmer_name, u.farmer_category as caste,
             p.name as pond_name, p.area_hectares,
             ST_Y(p.location::geometry) as latitude,
             ST_X(p.location::geometry) as longitude,
             COALESCE(p.district_code, 'BR-MADHUBANI') as district_code,
             (
               SELECT COALESCE(json_agg(doc_row), '[]'::json)
               FROM (
                 SELECT ad.id, ad.doc_type, ad.file_path, ad.file_name, ad.mime_type,
                        ad.verification_status, ad.rejection_reason
                 FROM application_documents ad
                 WHERE ad.application_id = ya.id
               ) doc_row
             ) as documents
      FROM yojana_applications ya
      JOIN users u ON u.id = ya.user_id
      JOIN ponds p ON p.id = ya.pond_id
      ${whereClause}
      ORDER BY ya.created_at DESC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `, paginatedParams);

    const mappedApplications = result.rows.map(row => {
      let casteDisplay = 'General';
      const rowCaste = row.applicant_category || row.caste;
      if (rowCaste === 'SC') casteDisplay = 'SC';
      else if (rowCaste === 'ST') casteDisplay = 'ST';
      else if (rowCaste === 'EBC' || rowCaste === 'WOMEN') casteDisplay = 'EBC';

      let statusDisplay = 'Awaiting Review';
      if (row.status === 'DLC_QUEUE') statusDisplay = 'DLC Queue';
      else if (row.status === 'APPROVED') statusDisplay = 'Approved';
      else if (row.status === 'MILESTONE_1_MET') statusDisplay = 'Milestone 1 Met';
      else if (row.status === 'MILESTONE_2_MET') statusDisplay = 'Milestone 2 Met';
      else if (row.status === 'REJECTED') statusDisplay = 'Rejected';

      const distParts = row.district_code.split('-');
      const districtDisplay = distParts[distParts.length - 1];

      const dashboardDocs = row.documents.map((d: any) => {
        let name = d.doc_type;
        if (d.doc_type === 'AADHAAR') name = 'Aadhaar Card';
        else if (d.doc_type === 'CASTE_CERT') name = 'Caste Certificate';
        else if (d.doc_type === 'LAND_DEED') name = 'Land Registry (LPC)';
        else if (d.doc_type === 'BANK_PASSBOOK') name = 'Bank Passbook (Seeded)';
        else if (d.doc_type === 'INCOME_CERT') name = 'Income Certificate';
        else if (d.doc_type === 'POND_PHOTO') name = 'Geo-tagged Pond Photos';
        else if (d.doc_type === 'POWER_PROOF') name = 'Power Proof (Electricity Bill)';
        else if (d.doc_type === 'TRAINING_CERT') name = 'Aquaculture Training Certificate';
        else if (d.doc_type === 'PASSPORT_PHOTO') name = 'Passport Photograph';

        return {
          id: d.id,
          name,
          doc_type: d.doc_type,
          filePath: d.file_path,
          fileName: d.file_name,
          status: d.verification_status.toLowerCase(),
          rejectionReason: d.rejection_reason
        };
      });

      return {
        id: row.id,
        appNum: `APP-2026-${row.yojana_code}-${row.id.substring(0, 3).toUpperCase()}`,
        farmerName: row.applicant_name || row.farmer_name,
        caste: casteDisplay,
        yojanaName: row.db_yojana_name || row.yojana_code,
        district: row.applicant_district || (districtDisplay.charAt(0).toUpperCase() + districtDisplay.slice(1).toLowerCase()),
        landArea: row.applicant_land_area ? `${parseFloat(row.applicant_land_area).toFixed(1)} Acres` : `${(parseFloat(row.area_hectares) * 2.471).toFixed(1)} Acres`,
        documents: dashboardDocs,
        gpsCoords: `${parseFloat(row.latitude).toFixed(4)} N, ${parseFloat(row.longitude).toFixed(4)} E`,
        gpsMatch: true,
        status: statusDisplay,
        milestones: row.milestones,
        subsidyAmount: `₹${parseFloat(row.approved_subsidy_amount).toLocaleString('en-IN')}`,
        projectDescription: row.project_description || '',
        applicationRejectionReason: row.application_rejection_reason || '',
      };
    });

    res.json({
      success: true,
      data: mappedApplications,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/yojana/admin/locations/districts
router.get('/admin/locations/districts', requireAdmin, async (req, res, next) => {
  try {
    const districts = await query(`
      SELECT code, name FROM loc_districts ORDER BY name ASC
    `);
    res.json({
      success: true,
      data: districts.rows
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/yojana/admin/locations/blocks
router.get('/admin/locations/blocks', requireAdmin, async (req, res, next) => {
  try {
    const districtCode = req.query.districtCode as string || '';
    let result;
    if (districtCode) {
      result = await query(`
        SELECT code, name FROM loc_blocks WHERE district_code = $1 ORDER BY name ASC
      `, [districtCode]);
    } else {
      result = await query(`
        SELECT code, name FROM loc_blocks ORDER BY name ASC
      `);
    }
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/yojana/admin/locations/panchayats
router.get('/admin/locations/panchayats', requireAdmin, async (req, res, next) => {
  try {
    const blockCode = req.query.blockCode as string || '';
    let result;
    if (blockCode) {
      result = await query(`
        SELECT code, name FROM loc_panchayats WHERE block_code = $1 ORDER BY name ASC
      `, [blockCode]);
    } else {
      result = await query(`
        SELECT code, name FROM loc_panchayats ORDER BY name ASC
      `);
    }
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/yojana/admin/applications/mis-stats
router.get('/admin/applications/mis-stats', requireAdmin, async (req, res, next) => {
  try {
    const groupBy = req.query.groupBy as string || 'district'; // 'district' | 'block' | 'panchayat'
    const districtCode = req.query.districtCode as string || '';
    const blockCode = req.query.blockCode as string || '';

    let selectCol = 'p.district_code as code, ld.name as name';
    let joinTable = 'JOIN loc_districts ld ON ld.code = p.district_code';
    let groupCol = 'p.district_code, ld.name';
    let whereClause = '';
    const queryParams: any[] = [];

    if (groupBy === 'block') {
      selectCol = 'p.block_code as code, lb.name as name, p.district_code';
      joinTable = 'JOIN loc_blocks lb ON lb.code = p.block_code';
      groupCol = 'p.block_code, lb.name, p.district_code';
      if (districtCode) {
        queryParams.push(districtCode);
        whereClause = `WHERE p.district_code = $${queryParams.length}`;
      }
    } else if (groupBy === 'panchayat') {
      selectCol = 'p.panchayat_code as code, lp.name as name, p.block_code';
      joinTable = 'JOIN loc_panchayats lp ON lp.code = p.panchayat_code';
      groupCol = 'p.panchayat_code, lp.name, p.block_code';
      if (blockCode) {
        queryParams.push(blockCode);
        whereClause = `WHERE p.block_code = $${queryParams.length}`;
      } else if (districtCode) {
        queryParams.push(districtCode);
        whereClause = `WHERE p.district_code = $${queryParams.length}`;
      }
    }

    const statsRes = await query(`
      SELECT 
        ${selectCol},
        COUNT(*) FILTER (WHERE ya.status = 'AWAITING_REVIEW') as awaiting_review_count,
        COUNT(*) FILTER (WHERE ya.status = 'DLC_QUEUE') as dlc_queue_count,
        COUNT(*) FILTER (WHERE ya.status = 'APPROVED') as approved_count,
        COUNT(*) FILTER (WHERE ya.status = 'MILESTONE_1_MET') as milestone_1_count,
        COUNT(*) FILTER (WHERE ya.status = 'MILESTONE_2_MET') as completed_count,
        COUNT(*) FILTER (WHERE ya.status = 'REJECTED') as rejected_count,
        COUNT(*) as total_count,
        COALESCE(SUM(ya.approved_subsidy_amount), 0) as total_subsidy_amount
      FROM yojana_applications ya
      JOIN ponds p ON p.id = ya.pond_id
      ${joinTable}
      ${whereClause}
      GROUP BY ${groupCol}
      ORDER BY name ASC
    `, queryParams);

    res.json({
      success: true,
      data: statsRes.rows.map(row => ({
        code: row.code,
        name: row.name,
        parentCode: row.district_code || row.block_code || null,
        awaiting_review: parseInt(row.awaiting_review_count, 10),
        dlc_queue: parseInt(row.dlc_queue_count, 10),
        approved: parseInt(row.approved_count, 10),
        milestone_1: parseInt(row.milestone_1_count, 10),
        completed: parseInt(row.completed_count, 10),
        rejected: parseInt(row.rejected_count, 10),
        total: parseInt(row.total_count, 10),
        totalSubsidy: parseFloat(row.total_subsidy_amount)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/yojana/admin/documents/:docId/view-url
// Generates a 60-second signed Supabase read URL for a document
router.get('/admin/documents/:docId/view-url', requireAdmin, async (req, res, next) => {
  try {
    const docId = uuidParam.parse(req.params.docId);

    const docResult = await query(`
      SELECT file_path FROM application_documents WHERE id = $1
    `, [docId]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const downloadUrl = await SupabaseService.getSignedDownloadUrl(docResult.rows[0].file_path);
    res.json({
      success: true,
      data: {
        url: downloadUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/yojana/admin/documents/:docId/verify
// Mark document status as verified or rejected (with reason)
router.patch('/admin/documents/:docId/verify', requireAdmin, async (req, res, next) => {
  try {
    const adminId = req.auth!.userId;
    const docId = uuidParam.parse(req.params.docId);
    const { status, rejectionReason } = docVerifySchema.parse(req.body);

    if (status === 'REJECTED' && (!rejectionReason || rejectionReason.trim().length < 10)) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason of at least 10 characters is required when rejecting a document.'
      });
    }

    const updateResult = await query(`
      UPDATE application_documents
      SET 
        verification_status = $1, 
        rejection_reason = $2, 
        verified_by_admin = $3, 
        verified_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, rejectionReason || null, adminId, docId]);

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({
      success: true,
      data: updateResult.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/yojana/admin/applications/:id/reject
// Fully reject the application with a reason
router.patch('/admin/applications/:id/reject', requireAdmin, async (req, res, next) => {
  try {
    const appId = uuidParam.parse(req.params.id);
    const { rejectionReason } = appRejectSchema.parse(req.body);

    const result = await query(`
      UPDATE yojana_applications
      SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [rejectionReason, appId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
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
             dt.amount, dt.status, dt.farmer_confirmed, dt.processed_at::date::text as date,
             ys.name_en AS db_yojana_name
      FROM dbt_transactions dt
      JOIN yojana_applications ya ON ya.id = dt.application_id
      JOIN users u ON u.id = ya.user_id
      LEFT JOIN yojana_schemes ys ON ys.code = ya.yojana_code
      ORDER BY dt.processed_at DESC
      LIMIT 20
    `);

    const mappedTxns = txnsResult.rows.map(row => ({
      id: row.id,
      utr: row.utr,
      farmerName: row.farmer_name,
      yojana: row.db_yojana_name || row.yojana_code,
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

// GET /api/v1/yojana/schemes
// Public list of active schemes for mobile app
router.get('/schemes', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT code, name_en, name_hi, tagline, description, subsidy_by_category, 
             unit_cost_cap_lakh, max_subsidy_lakh, eligibility, required_documents, 
             geofence, classification, accent_color, milestones, status
      FROM yojana_schemes
      WHERE status = 'ACTIVE'
      ORDER BY code
    `);
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        code: row.code,
        nameEn: row.name_en,
        nameHi: row.name_hi,
        tagline: row.tagline,
        description: row.description,
        subsidyByCategory: row.subsidy_by_category,
        unitCostCapLakh: parseFloat(row.unit_cost_cap_lakh),
        maxSubsidyLakh: parseFloat(row.max_subsidy_lakh),
        eligibility: row.eligibility,
        requiredDocuments: row.required_documents,
        geofence: row.geofence,
        classification: row.classification,
        accentColor: row.accent_color,
        milestones: row.milestones,
        status: row.status
      }))
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/yojana/admin/schemes
// Admin list of all schemes (including Inactive and Archived)
router.get('/admin/schemes', requireAdmin, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT code, name_en, name_hi, tagline, description, subsidy_by_category, 
             unit_cost_cap_lakh, max_subsidy_lakh, eligibility, required_documents, 
             geofence, classification, accent_color, milestones, status
      FROM yojana_schemes
      ORDER BY status = 'ACTIVE' DESC, code ASC
    `);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        code: row.code,
        nameEn: row.name_en,
        nameHi: row.name_hi,
        tagline: row.tagline,
        description: row.description,
        subsidyByCategory: row.subsidy_by_category,
        unitCostCapLakh: parseFloat(row.unit_cost_cap_lakh),
        maxSubsidyLakh: parseFloat(row.max_subsidy_lakh),
        eligibility: row.eligibility,
        requiredDocuments: row.required_documents,
        geofence: row.geofence,
        classification: row.classification,
        accentColor: row.accent_color,
        milestones: row.milestones,
        status: row.status
      }))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/yojana/admin/schemes
// Create a new yojana scheme config
router.post('/admin/schemes', requireAdmin, async (req, res, next) => {
  try {
    const body = schemeSchema.parse(req.body);
    const existing = await query(`SELECT code FROM yojana_schemes WHERE code = $1`, [body.code]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Scheme code already exists' });
    }

    await query(`
      INSERT INTO yojana_schemes (
        code, name_en, name_hi, tagline, description, subsidy_by_category, 
        unit_cost_cap_lakh, max_subsidy_lakh, eligibility, required_documents, 
        geofence, classification, accent_color, milestones, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      body.code, body.nameEn, body.nameHi, body.tagline || null, body.description || null,
      JSON.stringify(body.subsidyByCategory), body.unitCostCapLakh, body.maxSubsidyLakh,
      JSON.stringify(body.eligibility), JSON.stringify(body.requiredDocuments),
      body.geofence || null, body.classification || null, body.accentColor,
      JSON.stringify(body.milestones), body.status || 'ACTIVE'
    ]);

    // Insert into admin audit log
    await query(`
      INSERT INTO admin_audit_log (admin_user_id, action, resource_type, resource_id, metadata)
      VALUES ($1, 'scheme.create', 'scheme', NULL, $2)
    `, [req.admin!.adminId, JSON.stringify({ code: body.code })]);

    res.json({ success: true, message: 'Yojana scheme created successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/yojana/admin/schemes/:code
// Edit yojana scheme details with mandatory audit trail log
router.put('/admin/schemes/:code', requireAdmin, async (req, res, next) => {
  try {
    const { code } = req.params;
    const body = schemeUpdateSchema.parse(req.body);

    const selectRes = await query(`SELECT * FROM yojana_schemes WHERE code = $1`, [code]);
    if (selectRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Scheme not found' });
    }
    const previous = selectRes.rows[0];

    // Begin Transaction
    await query('BEGIN');

    await query(`
      UPDATE yojana_schemes SET
        name_en = $1, name_hi = $2, tagline = $3, description = $4,
        subsidy_by_category = $5, unit_cost_cap_lakh = $6, max_subsidy_lakh = $7,
        eligibility = $8, required_documents = $9, geofence = $10,
        classification = $11, accent_color = $12, milestones = $13,
        status = $14, updated_at = NOW()
      WHERE code = $15
    `, [
      body.nameEn, body.nameHi, body.tagline || null, body.description || null,
      JSON.stringify(body.subsidyByCategory), body.unitCostCapLakh, body.maxSubsidyLakh,
      JSON.stringify(body.eligibility), JSON.stringify(body.requiredDocuments),
      body.geofence || null, body.classification || null, body.accentColor,
      JSON.stringify(body.milestones), body.status, code
    ]);

    // Insert Audit trail amendment
    await query(`
      INSERT INTO yojana_scheme_amendments (scheme_code, amended_by, change_summary, previous_data, new_data)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      code,
      req.admin!.adminId,
      body.changeSummary,
      JSON.stringify(previous),
      JSON.stringify({
        name_en: body.nameEn, name_hi: body.nameHi, tagline: body.tagline, description: body.description,
        subsidy_by_category: body.subsidyByCategory, unit_cost_cap_lakh: body.unitCostCapLakh,
        max_subsidy_lakh: body.maxSubsidyLakh, eligibility: body.eligibility,
        required_documents: body.requiredDocuments, geofence: body.geofence,
        classification: body.classification, accent_color: body.accentColor,
        milestones: body.milestones, status: body.status
      })
    ]);

    // Insert general admin audit log
    await query(`
      INSERT INTO admin_audit_log (admin_user_id, action, resource_type, resource_id, metadata)
      VALUES ($1, 'scheme.amend', 'scheme', NULL, $2)
    `, [req.admin!.adminId, JSON.stringify({ code, changeSummary: body.changeSummary })]);

    await query('COMMIT');

    res.json({ success: true, message: 'Yojana guidelines amended and logged successfully' });
  } catch (error) {
    await query('ROLLBACK');
    next(error);
  }
});

// GET /api/v1/yojana/admin/schemes/:code/amendments
// Retrieve guidelines amendment audit timeline history
router.get('/admin/schemes/:code/amendments', requireAdmin, async (req, res, next) => {
  try {
    const { code } = req.params;
    const result = await query(`
      SELECT ysa.id, ysa.scheme_code, ysa.change_summary, ysa.previous_data, ysa.new_data, ysa.created_at,
             au.full_name AS admin_name, au.email AS admin_email
      FROM yojana_scheme_amendments ysa
      LEFT JOIN admin_users au ON au.id = ysa.amended_by
      WHERE ysa.scheme_code = $1
      ORDER BY ysa.created_at DESC
    `, [code]);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        schemeCode: row.scheme_code,
        changeSummary: row.change_summary,
        previousData: row.previous_data,
        newData: row.new_data,
        createdAt: row.created_at,
        adminName: row.admin_name || 'System Operator',
        adminEmail: row.admin_email || 'admin@matsyamitra.gov.in'
      }))
    });
  } catch (error) {
    next(error);
  }
});

export { router as yojanaRouter };

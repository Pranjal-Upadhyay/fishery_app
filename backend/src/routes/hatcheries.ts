/**
 * Hatcheries API Routes
 * Full lifecycle management for hatchery operators:
 * - CRUD for hatcheries and batches
 * - Stage advancement with water quality logging
 * - Fingerling sales with transaction refs
 * - Marketplace listing for farmers
 */

import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db';
import { logger } from '../utils/logger';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createHatcherySchema = z.object({
  name: z.string().min(2).max(200).trim(),
  district: z.string().max(120).optional(),
  block: z.string().max(160).optional(),
  panchayat: z.string().max(200).optional(),
  capacity_kg: z.number().positive().optional(),
  hatchery_uid: z.string().min(3).max(64).optional(),
  contact_number: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional(),
  upi_id: z.string().max(120).optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  social_category: z.string().max(40).optional().nullable(),
  age: z.number().int().positive().optional().nullable(),
  annual_income: z.number().nonnegative().optional().nullable(),
  family_size: z.number().int().nonnegative().optional().nullable(),
  flood_impact_3yrs: z.boolean().optional().nullable(),
  disease_occurrence: z.enum(['NONE', 'MINOR', 'MAJOR']).optional().nullable(),
  pond_insured: z.boolean().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  female_headed: z.boolean().optional().nullable(),
  education_level: z.string().max(100).optional().nullable(),
  income_control: z.string().max(100).optional().nullable(),
});

const updateHatcheryProfileSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  district: z.string().max(120).optional().nullable(),
  block: z.string().max(160).optional().nullable(),
  panchayat: z.string().max(200).optional().nullable(),
  capacity_kg: z.number().positive().optional().nullable(),
  hatchery_uid: z.string().min(3).max(64).optional().nullable(),
  contact_number: z.string().regex(/^[6-9]\d{9}$/).optional().nullable(),
  email: z.string().email().optional().nullable(),
  upi_id: z.string().max(120).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  social_category: z.string().max(40).optional().nullable(),
  age: z.number().int().positive().optional().nullable(),
  annual_income: z.number().nonnegative().optional().nullable(),
  family_size: z.number().int().nonnegative().optional().nullable(),
  flood_impact_3yrs: z.boolean().optional().nullable(),
  disease_occurrence: z.enum(['NONE', 'MINOR', 'MAJOR']).optional().nullable(),
  pond_insured: z.boolean().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  female_headed: z.boolean().optional().nullable(),
  education_level: z.string().max(100).optional().nullable(),
  income_control: z.string().max(100).optional().nullable(),
});

const createBatchSchema = z.object({
  species_name: z.string().min(2).max(100).trim(),
  species_variant: z.string().max(100).optional(),
  broodstock_male_count: z.number().int().nonnegative().optional(),
  broodstock_female_count: z.number().int().nonnegative().optional(),
  broodstock_total_kg: z.number().nonnegative().optional(),
  spawning_date: z.string().datetime({ offset: true }).optional(),
  estimated_spawn_count: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

const advanceStageSchema = z.object({
  new_stage: z.enum(['broodstock', 'spawning', 'hatching', 'nursery', 'rearing', 'fingerling_ready', 'sold']),
  count_at_entry: z.number().int().nonnegative().optional(),
  water_temp: z.number().optional(),
  ph: z.number().optional(),
  do_mgl: z.number().optional(),
  ammonia_ppm: z.number().optional(),
  feed_given_kg: z.number().nonnegative().optional(),
  observations: z.string().max(1000).optional(),
});

const stageLogSchema = z.object({
  stage: z.string(),
  count_at_entry: z.number().int().nonnegative().optional(),
  count_at_exit: z.number().int().nonnegative().optional(),
  water_temp: z.number().optional(),
  ph: z.number().optional(),
  do_mgl: z.number().optional(),
  ammonia_ppm: z.number().optional(),
  feed_given_kg: z.number().nonnegative().optional(),
  observations: z.string().max(1000).optional(),
  estimated_fry_count: z.number().int().nonnegative().optional(),
  estimated_fingerling_count: z.number().int().nonnegative().optional(),
  avg_fingerling_weight_g: z.number().nonnegative().optional(),
});

const fingerlingSaleSchema = z.object({
  buyer_uid: z.string().max(32).optional().nullable(),
  buyer_name: z.string().min(2).max(100).trim().optional().nullable(),
  buyer_phone: z.string().max(20).optional().nullable(),
  buyer_district: z.string().max(120).optional().nullable(),
  pricing_model: z.enum(['per_piece', 'per_kg']),
  quantity_pieces: z.number().int().nonnegative().optional().nullable(),
  quantity_kg: z.number().nonnegative().optional().nullable(),
  avg_weight_g: z.number().nonnegative().optional().nullable(),
  total_amount: z.number().nonnegative(),
  delivery_date: z.string().datetime({ offset: true }).optional(),
  species_name: z.string().min(2).max(100).optional(),
  species_variant: z.string().max(100).optional(),
});

const STAGE_GUIDELINES: Record<string, string> = {
  broodstock: 'Batch moved to Broodstock stage. Conditioning guidelines: Maintain controlled density (100-200 kg/ha) and feed high-protein diet (30-35% protein). Optimal water temperature is 26-32°C.',
  spawning: 'Batch advanced to Induced Spawning stage. Induced spawning protocol: Females get primary/secondary hormone dose (Ovaprim/HCG); latency period is 6-12 hours in aerated circular spawning tanks. Monitor and log estimated egg count.',
  hatching: 'Batch advanced to Hatching stage. Fertilized eggs hatch in 12-20 hours (at 28°C). Keep circular troughs circulating. Sac fry will absorb yolk sacs over the next 48-72 hours (do not feed externally).',
  nursery: 'Batch advanced to Nursery Pond. Stocking density: 3-5 million spawn/hectare in shallow ponds. Ensure pre-treatment with lime and organic manure for zooplankton bloom. Supplemental feeding begins Day 5-7.',
  rearing: 'Batch advanced to Rearing Pond. Stocking density: 0.2-0.5 million fry/hectare. Supplemental feeding continues twice daily. Monitor water quality (DO, pH, ammonia) closely.',
  fingerling_ready: 'Batch advanced to Fingerling Ready stage. Average weight is typically 8-15g. Record fingerling sales to generate transaction QR codes for grow-out farmers.',
  sold: 'Batch completed and sold. Fingerling sales recorded and handoff transaction finalized.'
};

// ─── GET /api/v1/hatcheries ───────────────────────────────────────────────────
// List all hatcheries (operators see their own; anyone can browse public list)

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;

    const result = await query(`
      SELECT h.id, h.name, h.district, h.block, h.panchayat, h.capacity_kg,
             h.hatchery_uid, h.contact_number, h.email, h.upi_id,
             h.latitude, h.longitude,
             h.created_at, h.updated_at,
             u.name AS operator_name,
             COUNT(b.id) FILTER (WHERE b.current_stage NOT IN ('sold')) AS active_batch_count
      FROM hatcheries h
      LEFT JOIN users u ON u.id = h.operator_id
      LEFT JOIN hatchery_batches b ON b.hatchery_id = h.id
      WHERE h.operator_id = $1
      GROUP BY h.id, u.name
      ORDER BY h.created_at DESC
    `, [userId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/hatcheries/me-profile ────────────────────────────────────────
// Returns the operator's hatchery profile (incl. marketplace-required fields).
// MUST be defined before /:id to avoid route shadowing.

router.get('/me-profile', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const result = await query(`
      SELECT h.id, h.name, h.district, h.block, h.panchayat, h.capacity_kg,
             h.hatchery_uid, h.contact_number, h.email, h.upi_id,
             h.latitude, h.longitude,
             h.social_category, h.age, h.annual_income, h.family_size,
             h.flood_impact_3yrs, h.disease_occurrence, h.pond_insured,
             h.gender, h.female_headed, h.education_level, h.income_control,
             h.created_at, h.updated_at,
             u.phone_number AS operator_phone
      FROM hatcheries h
      JOIN users u ON u.id = h.operator_id
      WHERE h.operator_id = $1
      LIMIT 1
    `, [userId]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'No hatchery profile found for this account.' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/v1/hatcheries/me-profile ──────────────────────────────────────
// Updates the operator's hatchery profile (marketplace-required fields).
// MUST be defined before /:id to avoid route shadowing.

router.patch('/me-profile', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const data = updateHatcheryProfileSchema.parse(req.body);

    const existing = await query(
      'SELECT id FROM hatcheries WHERE operator_id = $1 LIMIT 1',
      [userId],
    );

    // If no hatchery exists yet, allow upsert (name is required for new)
    if (!existing.rows.length) {
      if (!data.name) {
        return res.status(400).json({
          success: false,
          error: 'A hatchery name is required to create your profile.',
        });
      }
      const created = await query(`
        INSERT INTO hatcheries (
          name, operator_id, district, block, panchayat, capacity_kg,
          hatchery_uid, contact_number, email, upi_id, latitude, longitude,
          social_category, age, annual_income, family_size, flood_impact_3yrs,
          disease_occurrence, pond_insured, gender, female_headed, education_level, income_control
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `, [
        data.name, userId, data.district ?? null, data.block ?? null,
        data.panchayat ?? null, data.capacity_kg ?? null,
        data.hatchery_uid ?? null, data.contact_number ?? null,
        data.email ?? null, data.upi_id ?? null,
        data.latitude ?? null, data.longitude ?? null,
        data.social_category ?? null, data.age ?? null, data.annual_income ?? null,
        data.family_size ?? null, data.flood_impact_3yrs ?? null,
        data.disease_occurrence ?? null, data.pond_insured ?? null,
        data.gender ?? null, data.female_headed ?? null,
        data.education_level ?? null, data.income_control ?? null
      ]);
      return res.status(201).json({ success: true, data: created.rows[0] });
    }

    // Build dynamic update
    const fields: string[] = [];
    const params: unknown[] = [];
    const push = (col: string, val: unknown) => {
      params.push(val);
      fields.push(`${col} = $${params.length}`);
    };

    if (data.name !== undefined) push('name', data.name);
    if (data.district !== undefined) push('district', data.district);
    if (data.block !== undefined) push('block', data.block);
    if (data.panchayat !== undefined) push('panchayat', data.panchayat);
    if (data.capacity_kg !== undefined) push('capacity_kg', data.capacity_kg);
    if (data.hatchery_uid !== undefined) push('hatchery_uid', data.hatchery_uid);
    if (data.contact_number !== undefined) push('contact_number', data.contact_number);
    if (data.email !== undefined) push('email', data.email);
    if (data.upi_id !== undefined) push('upi_id', data.upi_id);
    if (data.latitude !== undefined) push('latitude', data.latitude);
    if (data.longitude !== undefined) push('longitude', data.longitude);
    if (data.social_category !== undefined) push('social_category', data.social_category);
    if (data.age !== undefined) push('age', data.age);
    if (data.annual_income !== undefined) push('annual_income', data.annual_income);
    if (data.family_size !== undefined) push('family_size', data.family_size);
    if (data.flood_impact_3yrs !== undefined) push('flood_impact_3yrs', data.flood_impact_3yrs);
    if (data.disease_occurrence !== undefined) push('disease_occurrence', data.disease_occurrence);
    if (data.pond_insured !== undefined) push('pond_insured', data.pond_insured);
    if (data.gender !== undefined) push('gender', data.gender);
    if (data.female_headed !== undefined) push('female_headed', data.female_headed);
    if (data.education_level !== undefined) push('education_level', data.education_level);
    if (data.income_control !== undefined) push('income_control', data.income_control);

    if (!fields.length) {
      return res.json({ success: true, data: existing.rows[0] });
    }

    fields.push('updated_at = NOW()');
    params.push(userId);
    const result = await query(`
      UPDATE hatcheries SET ${fields.join(', ')}
      WHERE operator_id = $${params.length}
      RETURNING *
    `, params);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/hatcheries ──────────────────────────────────────────────────
// Create a new hatchery (operator must be authenticated)

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const data = createHatcherySchema.parse(req.body);

    const result = await query(`
      INSERT INTO hatcheries (
        name, operator_id, district, block, panchayat, capacity_kg,
        hatchery_uid, contact_number, email, upi_id, latitude, longitude,
        social_category, age, annual_income, family_size, flood_impact_3yrs,
        disease_occurrence, pond_insured, gender, female_headed, education_level, income_control
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
    `, [
      data.name, userId, data.district ?? null, data.block ?? null,
      data.panchayat ?? null, data.capacity_kg ?? null,
      data.hatchery_uid ?? null, data.contact_number ?? null,
      data.email ?? null, data.upi_id ?? null,
      data.latitude ?? null, data.longitude ?? null,
      data.social_category ?? null, data.age ?? null, data.annual_income ?? null,
      data.family_size ?? null, data.flood_impact_3yrs ?? null,
      data.disease_occurrence ?? null, data.pond_insured ?? null,
      data.gender ?? null, data.female_headed ?? null,
      data.education_level ?? null, data.income_control ?? null
    ]);

    logger.info('Hatchery created', { hatcheryId: result.rows[0].id, userId });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/hatcheries/marketplace ───────────────────────────────────────
// Listing of fingerling-ready batches for farmers to browse.
// MUST be defined before GET /:id to prevent route shadowing.

router.get('/marketplace', requireAuth, async (req, res, next) => {
  try {
    const { district, species } = req.query;

    let whereClause = `WHERE b.current_stage = 'fingerling_ready'`;
    const params: any[] = [];

    if (district) {
      params.push(district);
      whereClause += ` AND LOWER(h.district) = LOWER($${params.length})`;
    }
    if (species) {
      params.push(`%${species}%`);
      whereClause += ` AND LOWER(b.species_name) ILIKE $${params.length}`;
    }

    const result = await query(`
      SELECT
        b.id, b.species_name, b.species_variant,
        b.estimated_fingerling_count, b.avg_fingerling_weight_g,
        b.updated_at,
        h.name AS hatchery_name,
        h.district AS hatchery_district,
        h.block AS hatchery_block,
        h.panchayat AS hatchery_panchayat,
        u.name AS operator_name,
        u.phone_number AS operator_phone
      FROM hatchery_batches b
      JOIN hatcheries h ON h.id = b.hatchery_id
      JOIN users u ON u.id = h.operator_id
      ${whereClause}
      ORDER BY b.updated_at DESC
      LIMIT 50
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/hatcheries/lookup-farmer ──────────────────────────────────────
// Lookup a farmer by UID and district to autofill sales details

router.get('/lookup-farmer', requireAuth, requireRole('HATCHERY', 'ADMIN'), async (req, res, next) => {
  try {
    const { uid, district } = req.query;
    if (!uid) {
      return res.status(400).json({ success: false, error: 'UID is required' });
    }

    const result = await query(`
      SELECT u.id, u.name, u.phone_number AS phone, u.district_code AS "districtCode", ld.name AS "districtName"
      FROM users u
      LEFT JOIN loc_districts ld ON ld.code = u.district_code
      WHERE u.role = 'FARMER' AND UPPER(u.uid) = UPPER($1)
    `, [String(uid).trim()]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Farmer not found with the given UID.' });
    }

    const farmer = result.rows[0];

    if (district) {
      const selectedDist = String(district).trim().toLowerCase();
      const farmerDistCode = (farmer.districtCode || '').toLowerCase();
      const farmerDistName = (farmer.districtName || '').toLowerCase();

      // Check if it matches code or name
      if (selectedDist !== farmerDistCode && selectedDist !== farmerDistName) {
        return res.status(400).json({
          success: false,
          error: `Farmer district mismatch. Selected: ${district}, Farmer registered in: ${farmer.districtName || farmer.districtCode || 'Not Specified'}`
        });
      }
    }

    res.json({
      success: true,
      data: {
        name: farmer.name,
        phone: farmer.phone,
        districtCode: farmer.districtCode,
        districtName: farmer.districtName
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/hatcheries/:id ───────────────────────────────────────────────
// Get single hatchery with batch summary

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;

    const hatcheryResult = await query(`
      SELECT h.*, u.name AS operator_name
      FROM hatcheries h
      LEFT JOIN users u ON u.id = h.operator_id
      WHERE h.id = $1 AND h.operator_id = $2
    `, [id, userId]);

    if (!hatcheryResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Hatchery not found' });
    }

    res.json({ success: true, data: hatcheryResult.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/hatcheries/:id/batches ──────────────────────────────────────
// List all batches for a hatchery

router.get('/:id/batches', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;

    // Verify operator owns this hatchery
    const ownerCheck = await query(
      'SELECT id FROM hatcheries WHERE id = $1 AND operator_id = $2',
      [id, userId]
    );
    if (!ownerCheck.rows.length) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await query(`
      SELECT b.*,
             (SELECT COUNT(*) FROM hatchery_stage_logs sl WHERE sl.batch_id = b.id) AS log_count,
             (SELECT sl.survival_rate_pct FROM hatchery_stage_logs sl
              WHERE sl.batch_id = b.id ORDER BY sl.created_at DESC LIMIT 1) AS last_survival_rate
      FROM hatchery_batches b
      WHERE b.hatchery_id = $1
      ORDER BY b.created_at DESC
    `, [id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/hatcheries/:id/batches ─────────────────────────────────────
// Create a new batch under a hatchery

router.post('/:id/batches', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.auth!.userId;
    const data = createBatchSchema.parse(req.body);

    const ownerCheck = await query(
      'SELECT id FROM hatcheries WHERE id = $1 AND operator_id = $2',
      [id, userId]
    );
    if (!ownerCheck.rows.length) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await query(`
      INSERT INTO hatchery_batches (
        hatchery_id, species_name, species_variant,
        broodstock_male_count, broodstock_female_count, broodstock_total_kg,
        spawning_date, estimated_spawn_count, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      data.species_name,
      data.species_variant ?? null,
      data.broodstock_male_count ?? null,
      data.broodstock_female_count ?? null,
      data.broodstock_total_kg ?? null,
      data.spawning_date ? new Date(data.spawning_date) : null,
      data.estimated_spawn_count ?? null,
      data.notes ?? null,
    ]);

    const newBatch = result.rows[0];

    // Log the initial broodstock stage transition
    await query(`
      INSERT INTO hatchery_stage_logs (
        batch_id, stage, count_at_entry, observations, logged_by
      )
      VALUES ($1, 'broodstock', $2, $3, $4)
    `, [
      newBatch.id,
      data.broodstock_male_count ? (data.broodstock_male_count + (data.broodstock_female_count || 0)) : null,
      'Batch created',
      userId,
    ]);

    // Send initial notification
    const initialGuide = STAGE_GUIDELINES.broodstock;
    const hatcheryInfo = await query('SELECT name FROM hatcheries WHERE id = $1', [id]);
    const hatcheryName = hatcheryInfo.rows[0]?.name || 'Hatchery';

    await query(`
      INSERT INTO farmer_notifications (farmer_id, type, title, message, is_read, created_at)
      VALUES ($1, 'hatchery_alert', $2, $3, FALSE, NOW())
    `, [userId, 'Hatchery Stage: BROODSTOCK', initialGuide]);

    await query(`
      INSERT INTO farmer_notifications (farmer_id, type, title, message, is_read, created_at)
      SELECT id, 'hatchery_alert', $1, $2, FALSE, NOW()
      FROM users WHERE role = 'ADMIN'
    `, [`Hatchery Alert — ${hatcheryName}`, `New batch created. ${initialGuide}`]);

    logger.info('Batch created', { batchId: newBatch.id, hatcheryId: id });
    res.status(201).json({ success: true, data: newBatch });
  } catch (error) {
    next(error);
  }
});

// ─── GET /api/v1/hatcheries/batches/:batchId ─────────────────────────────────
// Get batch details with recent stage logs

router.get('/batches/:batchId', requireAuth, async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.auth!.userId;

    const batchResult = await query(`
      SELECT b.*, h.name AS hatchery_name, h.district AS hatchery_district
      FROM hatchery_batches b
      JOIN hatcheries h ON h.id = b.hatchery_id
      WHERE b.id = $1 AND h.operator_id = $2
    `, [batchId, userId]);

    if (!batchResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    const logsResult = await query(`
      SELECT sl.*, u.name AS logged_by_name
      FROM hatchery_stage_logs sl
      LEFT JOIN users u ON u.id = sl.logged_by
      WHERE sl.batch_id = $1
      ORDER BY sl.created_at DESC
      LIMIT 20
    `, [batchId]);

    const benchmarksResult = await query(`
      SELECT * FROM hatchery_stage_benchmarks ORDER BY
        CASE stage
          WHEN 'broodstock' THEN 1
          WHEN 'spawning' THEN 2
          WHEN 'hatching' THEN 3
          WHEN 'nursery' THEN 4
          WHEN 'rearing' THEN 5
          WHEN 'fingerling_ready' THEN 6
          WHEN 'sold' THEN 7
        END
    `);

    res.json({
      success: true,
      data: {
        batch: batchResult.rows[0],
        logs: logsResult.rows,
        benchmarks: benchmarksResult.rows,
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── PATCH /api/v1/hatcheries/batches/:batchId/stage ─────────────────────────
// Advance batch to a new stage (also logs the transition)

router.patch('/batches/:batchId/stage', requireAuth, async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.auth!.userId;
    const data = advanceStageSchema.parse(req.body);

    const batchResult = await query(`
      SELECT b.id, b.current_stage, h.operator_id
      FROM hatchery_batches b
      JOIN hatcheries h ON h.id = b.hatchery_id
      WHERE b.id = $1
    `, [batchId]);

    if (!batchResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    if (batchResult.rows[0].operator_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const updatedBatch = await transaction(async (client) => {
      // Log the stage transition
      await client.query(`
        INSERT INTO hatchery_stage_logs (
          batch_id, stage, count_at_entry, water_temp, ph, do_mgl,
          ammonia_ppm, feed_given_kg, observations, logged_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        batchId,
        data.new_stage,
        data.count_at_entry ?? null,
        data.water_temp ?? null,
        data.ph ?? null,
        data.do_mgl ?? null,
        data.ammonia_ppm ?? null,
        data.feed_given_kg ?? null,
        data.observations ?? null,
        userId,
      ]);

      // Advance the batch stage
      const r = await client.query(`
        UPDATE hatchery_batches
        SET current_stage = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [data.new_stage, batchId]);

      return r.rows[0];
    });

    logger.info('Batch stage advanced', { batchId, newStage: data.new_stage });

    // Insert real-time notification on stage advancement
    const guideMessage = STAGE_GUIDELINES[data.new_stage];
    if (guideMessage) {
      // Get hatchery name
      const hatcheryInfo = await query(`
        SELECT h.name as hatchery_name
        FROM hatcheries h
        JOIN hatchery_batches b ON b.hatchery_id = h.id
        WHERE b.id = $1
      `, [batchId]);
      const hatcheryName = hatcheryInfo.rows[0]?.hatchery_name || 'Hatchery';

      // Insert for operator
      await query(`
        INSERT INTO farmer_notifications (farmer_id, type, title, message, is_read, created_at)
        VALUES ($1, 'hatchery_alert', $2, $3, FALSE, NOW())
      `, [userId, `Hatchery Stage Advanced: ${data.new_stage.toUpperCase()}`, guideMessage]);

      // Notify admins
      await query(`
        INSERT INTO farmer_notifications (farmer_id, type, title, message, is_read, created_at)
        SELECT id, 'hatchery_alert', $1, $2, FALSE, NOW()
        FROM users WHERE role = 'ADMIN'
      `, [`Hatchery Alert — ${hatcheryName}`, `Batch advanced to ${data.new_stage.toUpperCase()}. ${guideMessage}`]);
    }

    res.json({ success: true, data: updatedBatch });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/hatcheries/batches/:batchId/logs ───────────────────────────
// Add a water quality / count observation log for a batch

router.post('/batches/:batchId/logs', requireAuth, async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.auth!.userId;
    const data = stageLogSchema.parse(req.body);

    // Verify ownership
    const ownerCheck = await query(`
      SELECT h.operator_id FROM hatchery_batches b
      JOIN hatcheries h ON h.id = b.hatchery_id
      WHERE b.id = $1
    `, [batchId]);

    if (!ownerCheck.rows.length || ownerCheck.rows[0].operator_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const logResult = await query(`
      INSERT INTO hatchery_stage_logs (
        batch_id, stage, count_at_entry, count_at_exit,
        water_temp, ph, do_mgl, ammonia_ppm, feed_given_kg,
        observations, logged_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      batchId,
      data.stage,
      data.count_at_entry ?? null,
      data.count_at_exit ?? null,
      data.water_temp ?? null,
      data.ph ?? null,
      data.do_mgl ?? null,
      data.ammonia_ppm ?? null,
      data.feed_given_kg ?? null,
      data.observations ?? null,
      userId,
    ]);

    // Also update batch counts if provided
    if (data.estimated_fry_count !== undefined || data.estimated_fingerling_count !== undefined || data.avg_fingerling_weight_g !== undefined) {
      await query(`
        UPDATE hatchery_batches
        SET
          estimated_fry_count = COALESCE($1, estimated_fry_count),
          estimated_fingerling_count = COALESCE($2, estimated_fingerling_count),
          avg_fingerling_weight_g = COALESCE($3, avg_fingerling_weight_g),
          updated_at = NOW()
        WHERE id = $4
      `, [
        data.estimated_fry_count ?? null,
        data.estimated_fingerling_count ?? null,
        data.avg_fingerling_weight_g ?? null,
        batchId,
      ]);
    }

    res.status(201).json({ success: true, data: logResult.rows[0] });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/v1/hatcheries/batches/:batchId/sales ──────────────────────────
// Record a fingerling sale and return the transaction reference
function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91${cleaned.substring(2)}`;
  }
  return phone.startsWith('+') ? phone : `+${cleaned}`;
}

router.post('/batches/:batchId/sales', requireAuth, async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const userId = req.auth!.userId;
    const data = fingerlingSaleSchema.parse(req.body);

    // Verify ownership and that batch is fingerling_ready
    const batchCheck = await query(`
      SELECT b.current_stage, b.species_name, b.species_variant, h.operator_id
      FROM hatchery_batches b
      JOIN hatcheries h ON h.id = b.hatchery_id
      WHERE b.id = $1
    `, [batchId]);

    if (!batchCheck.rows.length) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }
    if (batchCheck.rows[0].operator_id !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const batch = batchCheck.rows[0];

    // Resolve buyer info
    let buyerName = data.buyer_name ? data.buyer_name.trim() : null;
    let normalizedPhone = normalizePhone(data.buyer_phone);
    let buyerDistrict = data.buyer_district ? data.buyer_district.trim() : null;
    const resolvedUid = data.buyer_uid ? data.buyer_uid.trim().toUpperCase() : null;

    if (resolvedUid) {
      const farmerRes = await query(`
        SELECT u.name, u.phone_number, ld.name AS district_name
        FROM users u
        LEFT JOIN loc_districts ld ON ld.code = u.district_code
        WHERE u.role = 'FARMER' AND UPPER(u.uid) = $1
      `, [resolvedUid]);

      if (!farmerRes.rows.length) {
        return res.status(404).json({ success: false, error: 'Buyer farmer not found with the given UID.' });
      }

      const farmer = farmerRes.rows[0];
      buyerName = farmer.name;
      normalizedPhone = farmer.phone_number;
      buyerDistrict = farmer.district_name || farmer.district_code || buyerDistrict;
    }

    // Calculations
    let calculatedPieces: number | null = null;
    let calculatedKg: number | null = null;
    let pricePerPiece: number | null = null;
    let pricePerKg: number | null = null;
    let avgWeightG: number | null = data.avg_weight_g || null;

    if (data.pricing_model === 'per_piece') {
      if (!data.quantity_pieces || data.quantity_pieces <= 0) {
        return res.status(400).json({ success: false, error: 'Quantity in pieces is required and must be positive for per-piece model.' });
      }
      calculatedPieces = data.quantity_pieces;
      pricePerPiece = data.total_amount / calculatedPieces;
    } else { // per_kg
      if (!data.quantity_kg || data.quantity_kg <= 0) {
        return res.status(400).json({ success: false, error: 'Quantity in kg is required and must be positive for per-kg model.' });
      }
      if (!avgWeightG || avgWeightG <= 0) {
        return res.status(400).json({ success: false, error: 'Average weight is required and must be positive for per-kg model to calculate piece count.' });
      }
      calculatedKg = data.quantity_kg;
      pricePerKg = data.total_amount / calculatedKg;
      calculatedPieces = Math.round((calculatedKg * 1000) / avgWeightG);
      pricePerPiece = data.total_amount / calculatedPieces;
    }

    const saleResult = await query(`
      INSERT INTO fingerling_sales (
        batch_id, buyer_name, buyer_phone, buyer_district,
        pricing_model, quantity_pieces, quantity_kg, avg_weight_g,
        price_per_piece, price_per_kg, total_amount, delivery_date,
        species_name, species_variant, buyer_uid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      batchId,
      buyerName,
      normalizedPhone,
      buyerDistrict,
      data.pricing_model,
      calculatedPieces,
      calculatedKg,
      avgWeightG,
      pricePerPiece,
      pricePerKg,
      data.total_amount,
      data.delivery_date ? new Date(data.delivery_date) : null,
      data.species_name || batch.species_name,
      data.species_variant || batch.species_variant || null,
      resolvedUid
    ]);

    logger.info('Fingerling sale recorded', {
      saleId: saleResult.rows[0].id,
      transactionRef: saleResult.rows[0].transaction_ref,
      batchId,
    });

    res.status(201).json({ success: true, data: saleResult.rows[0] });
  } catch (error) {
    next(error);
  }
});
// ─── GET /api/v1/hatcheries/sales/:ref ───────────────────────────────────────
// Farmer looks up a fingerling sale by transaction reference

router.get('/sales/:ref', requireAuth, async (req, res, next) => {
  try {
    const { ref } = req.params;

    const result = await query(`
      SELECT fs.*,
             b.species_name AS batch_species_name,
             b.species_variant AS batch_species_variant,
             b.avg_fingerling_weight_g,
             h.name AS hatchery_name,
             h.district AS hatchery_district,
             h.block AS hatchery_block,
             h.operator_id AS operator_id
      FROM fingerling_sales fs
      JOIN hatchery_batches b ON b.id = fs.batch_id
      JOIN hatcheries h ON h.id = b.hatchery_id
      WHERE fs.transaction_ref = $1
    `, [ref]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Transaction reference not found' });
    }

    const sale = result.rows[0];

    // Fetch requester's profile details to check authorization
    const userResult = await query('SELECT uid, phone_number, role FROM users WHERE id = $1', [req.auth!.userId]);
    const requester = userResult.rows[0];

    if (!requester) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const isAuthorized =
      requester.role === 'ADMIN' ||
      sale.operator_id === req.auth!.userId ||
      (sale.buyer_uid && sale.buyer_uid === requester.uid) ||
      (sale.buyer_phone && sale.buyer_phone === requester.phone_number);

    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: 'Access denied: you are not authorized to view this sale' });
    }

    res.json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
});

export { router as hatcheriesRouter };

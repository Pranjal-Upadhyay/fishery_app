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
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createHatcherySchema = z.object({
  name: z.string().min(2).max(200).trim(),
  district: z.string().max(120).optional(),
  block: z.string().max(160).optional(),
  panchayat: z.string().max(200).optional(),
  capacity_kg: z.number().positive().optional(),
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
  buyer_name: z.string().min(2).max(100).trim().optional(),
  buyer_phone: z.string().max(20).optional(),
  buyer_district: z.string().max(120).optional(),
  pricing_model: z.enum(['per_piece', 'per_kg']),
  quantity_pieces: z.number().int().nonnegative().optional(),
  quantity_kg: z.number().nonnegative().optional(),
  avg_weight_g: z.number().nonnegative().optional(),
  price_per_piece: z.number().nonnegative().optional(),
  price_per_kg: z.number().nonnegative().optional(),
  delivery_date: z.string().datetime({ offset: true }).optional(),
  species_name: z.string().min(2).max(100).optional(),
  species_variant: z.string().max(100).optional(),
});

// ─── GET /api/v1/hatcheries ───────────────────────────────────────────────────
// List all hatcheries (operators see their own; anyone can browse public list)

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;

    const result = await query(`
      SELECT h.id, h.name, h.district, h.block, h.panchayat, h.capacity_kg,
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

// ─── POST /api/v1/hatcheries ──────────────────────────────────────────────────
// Create a new hatchery (operator must be authenticated)

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const data = createHatcherySchema.parse(req.body);

    const result = await query(`
      INSERT INTO hatcheries (name, operator_id, district, block, panchayat, capacity_kg)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [data.name, userId, data.district ?? null, data.block ?? null, data.panchayat ?? null, data.capacity_kg ?? null]);

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

    logger.info('Batch created', { batchId: result.rows[0].id, hatcheryId: id });
    res.status(201).json({ success: true, data: result.rows[0] });
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

    // Calculate total amount
    let totalAmount: number | null = null;
    if (data.pricing_model === 'per_piece' && data.quantity_pieces && data.price_per_piece) {
      totalAmount = data.quantity_pieces * data.price_per_piece;
    } else if (data.pricing_model === 'per_kg' && data.quantity_kg && data.price_per_kg) {
      totalAmount = data.quantity_kg * data.price_per_kg;
    }

    const saleResult = await query(`
      INSERT INTO fingerling_sales (
        batch_id, buyer_name, buyer_phone, buyer_district,
        pricing_model, quantity_pieces, quantity_kg, avg_weight_g,
        price_per_piece, price_per_kg, total_amount, delivery_date,
        species_name, species_variant
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      batchId,
      data.buyer_name ?? null,
      data.buyer_phone ?? null,
      data.buyer_district ?? null,
      data.pricing_model,
      data.quantity_pieces ?? null,
      data.quantity_kg ?? null,
      data.avg_weight_g ?? null,
      data.price_per_piece ?? null,
      data.price_per_kg ?? null,
      totalAmount,
      data.delivery_date ? new Date(data.delivery_date) : null,
      data.species_name ?? batch.species_name,
      data.species_variant ?? batch.species_variant ?? null,
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
             h.block AS hatchery_block
      FROM fingerling_sales fs
      JOIN hatchery_batches b ON b.id = fs.batch_id
      JOIN hatcheries h ON h.id = b.hatchery_id
      WHERE fs.transaction_ref = $1
    `, [ref]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Transaction reference not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export { router as hatcheriesRouter };

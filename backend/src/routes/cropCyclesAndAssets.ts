/**
 * Crop Cycles & Farm Assets API
 *
 * Crop Cycles
 *   GET    /api/v1/crop-cycles                ?pondId=&status=  — list mine
 *   GET    /api/v1/crop-cycles/:id            — detail (owner only)
 *   POST   /api/v1/crop-cycles                — create
 *   PATCH  /api/v1/crop-cycles/:id            — update
 *   DELETE /api/v1/crop-cycles/:id            — delete
 *
 * Farm Assets
 *   GET    /api/v1/farm-assets                ?pondId= — list mine
 *   GET    /api/v1/farm-assets/:id            — detail (owner only)
 *   POST   /api/v1/farm-assets                — create
 *   PATCH  /api/v1/farm-assets/:id            — update
 *   DELETE /api/v1/farm-assets/:id            — delete
 *
 * Both are FARMER-scoped. Each row carries a `user_id` and queries always
 * filter by `req.auth.userId`.
 */

import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const cropCycleSchema = z.object({
    pond_id:                z.string().uuid(),
    cycle_name:             z.string().min(1).max(120).trim(),
    species_name:           z.string().max(120).optional().nullable(),
    start_date:             z.string().date(),
    end_date:               z.string().date().optional().nullable(),
    status:                 z.enum(['ONGOING','HARVESTED','CANCELLED']).optional(),
    present_production_kg:  z.number().nonnegative().optional().nullable(),
    total_production_kg:    z.number().nonnegative().optional().nullable(),
    feed_formulated_cost:   z.number().nonnegative().optional().nullable(),
    feed_homemade_cost:     z.number().nonnegative().optional().nullable(),
    probiotic_cost:         z.number().nonnegative().optional().nullable(),
    medicine_cost:          z.number().nonnegative().optional().nullable(),
    electricity_cost:       z.number().nonnegative().optional().nullable(),
    labour_hired_cost:      z.number().nonnegative().optional().nullable(),
    labour_family_cost:     z.number().nonnegative().optional().nullable(),
    other_cost:             z.number().nonnegative().optional().nullable(),
    revenue_inr:            z.number().nonnegative().optional().nullable(),
    remarks:                z.string().max(2000).optional().nullable(),
});

const cropCyclePatchSchema = cropCycleSchema.partial();

const ASSET_TYPES = [
    'AERATOR','MOTOR_PUMP','BOAT','FISH_NET','BORE_WELL',
    'BIOFLOC_TANK','RAS','BIOFLOC_POND','CIVIL_WORK_POND',
    'EMBANKMENT','OTHER',
] as const;

const farmAssetSchema = z.object({
    pond_id:             z.string().uuid().optional().nullable(),
    asset_type:          z.enum(ASSET_TYPES),
    asset_name:          z.string().min(1).max(160).trim(),
    purchase_date:       z.string().date(),
    cost_inr:            z.number().nonnegative(),
    economic_life_years: z.number().positive(),
    salvage_value_inr:   z.number().nonnegative().default(0),
    remarks:             z.string().max(2000).optional().nullable(),
});

const farmAssetPatchSchema = farmAssetSchema.partial();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function userOwnsPond(userId: string, pondId: string): Promise<boolean> {
    const r = await query('SELECT 1 FROM ponds WHERE id = $1 AND user_id = $2', [pondId, userId]);
    return (r.rowCount ?? 0) > 0;
}

// ─── CROP CYCLES ─────────────────────────────────────────────────────────────

router.get('/crop-cycles', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { pondId, status } = req.query;

        const conds = ['cc.user_id = $1'];
        const params: unknown[] = [userId];

        if (pondId && typeof pondId === 'string') {
            params.push(pondId);
            conds.push(`cc.pond_id = $${params.length}`);
        }
        if (status && typeof status === 'string') {
            params.push(status);
            conds.push(`cc.status = $${params.length}`);
        }

        const result = await query(`
            SELECT cc.*, p.name AS pond_name
            FROM crop_cycles cc
            JOIN ponds p ON p.id = cc.pond_id
            WHERE ${conds.join(' AND ')}
            ORDER BY cc.start_date DESC, cc.created_at DESC
            LIMIT 200
        `, params);

        res.json({ success: true, data: result.rows });
    } catch (e) { next(e); }
});

router.get('/crop-cycles/:id', requireAuth, async (req, res, next) => {
    try {
        const r = await query(`
            SELECT cc.*, p.name AS pond_name
            FROM crop_cycles cc
            JOIN ponds p ON p.id = cc.pond_id
            WHERE cc.id = $1 AND cc.user_id = $2
        `, [req.params.id, req.auth!.userId]);

        if (!r.rows.length) return res.status(404).json({ success: false, error: 'Not found.' });
        res.json({ success: true, data: r.rows[0] });
    } catch (e) { next(e); }
});

router.post('/crop-cycles', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const data = cropCycleSchema.parse(req.body);

        if (!(await userOwnsPond(userId, data.pond_id))) {
            return res.status(403).json({ success: false, error: 'Pond not found or access denied.' });
        }

        const r = await query(`
            INSERT INTO crop_cycles (
                pond_id, user_id, cycle_name, species_name, start_date, end_date, status,
                present_production_kg, total_production_kg,
                feed_formulated_cost, feed_homemade_cost, probiotic_cost, medicine_cost,
                electricity_cost, labour_hired_cost, labour_family_cost, other_cost,
                revenue_inr, remarks
            ) VALUES (
                $1,$2,$3,$4,$5,$6, COALESCE($7, 'ONGOING'),
                $8,$9,
                $10,$11,$12,$13,
                $14,$15,$16,$17,
                $18,$19
            )
            RETURNING *
        `, [
            data.pond_id, userId, data.cycle_name, data.species_name ?? null,
            data.start_date, data.end_date ?? null, data.status ?? null,
            data.present_production_kg ?? null, data.total_production_kg ?? null,
            data.feed_formulated_cost ?? null, data.feed_homemade_cost ?? null,
            data.probiotic_cost ?? null, data.medicine_cost ?? null,
            data.electricity_cost ?? null, data.labour_hired_cost ?? null,
            data.labour_family_cost ?? null, data.other_cost ?? null,
            data.revenue_inr ?? null, data.remarks ?? null,
        ]);

        logger.info('Crop cycle created', { id: r.rows[0].id, userId });
        res.status(201).json({ success: true, data: r.rows[0] });
    } catch (e) { next(e); }
});

router.patch('/crop-cycles/:id', requireAuth, async (req, res, next) => {
    try {
        const data = cropCyclePatchSchema.parse(req.body);
        const userId = req.auth!.userId;

        const existing = await query(
            'SELECT id FROM crop_cycles WHERE id = $1 AND user_id = $2',
            [req.params.id, userId],
        );
        if (!existing.rows.length) {
            return res.status(404).json({ success: false, error: 'Not found.' });
        }

        // Dynamic field assembly with explicit allowlist.
        const COL_MAP: Record<string, string> = {
            cycle_name: 'cycle_name', species_name: 'species_name',
            start_date: 'start_date', end_date: 'end_date', status: 'status',
            present_production_kg: 'present_production_kg',
            total_production_kg: 'total_production_kg',
            feed_formulated_cost: 'feed_formulated_cost',
            feed_homemade_cost: 'feed_homemade_cost',
            probiotic_cost: 'probiotic_cost',
            medicine_cost: 'medicine_cost',
            electricity_cost: 'electricity_cost',
            labour_hired_cost: 'labour_hired_cost',
            labour_family_cost: 'labour_family_cost',
            other_cost: 'other_cost',
            revenue_inr: 'revenue_inr',
            remarks: 'remarks',
        };

        const sets: string[] = [];
        const params: unknown[] = [];
        for (const [key, col] of Object.entries(COL_MAP)) {
            const val = (data as any)[key];
            if (val !== undefined) {
                params.push(val);
                sets.push(`${col} = $${params.length}`);
            }
        }
        if (!sets.length) {
            return res.json({ success: true, data: existing.rows[0] });
        }
        sets.push('updated_at = NOW()');
        params.push(req.params.id);

        const r = await query(`
            UPDATE crop_cycles SET ${sets.join(', ')}
            WHERE id = $${params.length} RETURNING *
        `, params);

        res.json({ success: true, data: r.rows[0] });
    } catch (e) { next(e); }
});

router.delete('/crop-cycles/:id', requireAuth, async (req, res, next) => {
    try {
        const r = await query(
            'DELETE FROM crop_cycles WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.auth!.userId],
        );
        if (!r.rows.length) return res.status(404).json({ success: false, error: 'Not found.' });
        res.json({ success: true });
    } catch (e) { next(e); }
});

// ─── FARM ASSETS ─────────────────────────────────────────────────────────────

router.get('/farm-assets', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { pondId } = req.query;

        const conds = ['fa.user_id = $1'];
        const params: unknown[] = [userId];

        if (pondId && typeof pondId === 'string') {
            params.push(pondId);
            conds.push(`fa.pond_id = $${params.length}`);
        }

        const result = await query(`
            SELECT fa.*, p.name AS pond_name
            FROM farm_assets fa
            LEFT JOIN ponds p ON p.id = fa.pond_id
            WHERE ${conds.join(' AND ')}
            ORDER BY fa.purchase_date DESC, fa.created_at DESC
            LIMIT 200
        `, params);

        res.json({ success: true, data: result.rows });
    } catch (e) { next(e); }
});

router.get('/farm-assets/:id', requireAuth, async (req, res, next) => {
    try {
        const r = await query(`
            SELECT fa.*, p.name AS pond_name
            FROM farm_assets fa
            LEFT JOIN ponds p ON p.id = fa.pond_id
            WHERE fa.id = $1 AND fa.user_id = $2
        `, [req.params.id, req.auth!.userId]);

        if (!r.rows.length) return res.status(404).json({ success: false, error: 'Not found.' });
        res.json({ success: true, data: r.rows[0] });
    } catch (e) { next(e); }
});

router.post('/farm-assets', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const data = farmAssetSchema.parse(req.body);

        if (data.pond_id && !(await userOwnsPond(userId, data.pond_id))) {
            return res.status(403).json({ success: false, error: 'Pond not found or access denied.' });
        }

        const r = await query(`
            INSERT INTO farm_assets (
                user_id, pond_id, asset_type, asset_name, purchase_date,
                cost_inr, economic_life_years, salvage_value_inr, remarks
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
        `, [
            userId, data.pond_id ?? null,
            data.asset_type, data.asset_name, data.purchase_date,
            data.cost_inr, data.economic_life_years,
            data.salvage_value_inr ?? 0,
            data.remarks ?? null,
        ]);

        logger.info('Farm asset created', { id: r.rows[0].id, userId });
        res.status(201).json({ success: true, data: r.rows[0] });
    } catch (e) { next(e); }
});

router.patch('/farm-assets/:id', requireAuth, async (req, res, next) => {
    try {
        const data = farmAssetPatchSchema.parse(req.body);
        const userId = req.auth!.userId;

        const existing = await query(
            'SELECT id FROM farm_assets WHERE id = $1 AND user_id = $2',
            [req.params.id, userId],
        );
        if (!existing.rows.length) {
            return res.status(404).json({ success: false, error: 'Not found.' });
        }

        if (data.pond_id && !(await userOwnsPond(userId, data.pond_id))) {
            return res.status(403).json({ success: false, error: 'Pond not found or access denied.' });
        }

        const COL_MAP: Record<string, string> = {
            pond_id: 'pond_id', asset_type: 'asset_type', asset_name: 'asset_name',
            purchase_date: 'purchase_date', cost_inr: 'cost_inr',
            economic_life_years: 'economic_life_years',
            salvage_value_inr: 'salvage_value_inr', remarks: 'remarks',
        };

        const sets: string[] = [];
        const params: unknown[] = [];
        for (const [key, col] of Object.entries(COL_MAP)) {
            const val = (data as any)[key];
            if (val !== undefined) {
                params.push(val);
                sets.push(`${col} = $${params.length}`);
            }
        }
        if (!sets.length) {
            return res.json({ success: true, data: existing.rows[0] });
        }
        sets.push('updated_at = NOW()');
        params.push(req.params.id);

        const r = await query(`
            UPDATE farm_assets SET ${sets.join(', ')}
            WHERE id = $${params.length} RETURNING *
        `, params);

        res.json({ success: true, data: r.rows[0] });
    } catch (e) { next(e); }
});

router.delete('/farm-assets/:id', requireAuth, async (req, res, next) => {
    try {
        const r = await query(
            'DELETE FROM farm_assets WHERE id = $1 AND user_id = $2 RETURNING id',
            [req.params.id, req.auth!.userId],
        );
        if (!r.rows.length) return res.status(404).json({ success: false, error: 'Not found.' });
        res.json({ success: true });
    } catch (e) { next(e); }
});

export { router as cropCyclesAndAssetsRouter };

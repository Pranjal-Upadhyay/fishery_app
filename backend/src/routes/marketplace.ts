/**
 * Marketplace API Routes
 * Hatcheries post fingerling / fry LISTINGS; farmers browse and place ORDERS.
 * Payment is off-platform (direct bank transfer).  Both sides confirm.
 *
 * Routes
 *   GET    /api/v1/marketplace/listings          – browse active listings
 *   GET    /api/v1/marketplace/listings/mine     – hatchery's own listings
 *   GET    /api/v1/marketplace/listings/:id      – listing detail
 *   POST   /api/v1/marketplace/listings          – create listing  (HATCHERY)
 *   PATCH  /api/v1/marketplace/listings/:id/cancel – cancel listing (HATCHERY)
 *
 *   POST   /api/v1/marketplace/orders            – place order     (FARMER)
 *   GET    /api/v1/marketplace/orders/mine       – my orders       (FARMER | HATCHERY)
 *   PATCH  /api/v1/marketplace/orders/:id/pay    – farmer marks paid
 *   PATCH  /api/v1/marketplace/orders/:id/confirm – hatchery confirms payment
 *   PATCH  /api/v1/marketplace/orders/:id/cancel – cancel order
 */

import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createListingSchema = z.object({
    stage:           z.enum(['fry', 'fingerling']),
    species_name:    z.string().min(2).max(100).trim(),
    species_variant: z.string().max(100).optional().nullable(),
    description:     z.string().max(1000).optional().nullable(),
    batch_id:        z.string().uuid().optional().nullable(),
    total_quantity:  z.number().int().positive(),
    min_order_qty:   z.number().int().positive().default(100),
    price_per_piece: z.number().nonnegative(),
});

const placeOrderSchema = z.object({
    listing_id:       z.string().uuid(),
    quantity_ordered: z.number().int().positive(),
    farmer_notes:     z.string().max(500).optional().nullable(),
    delivery_address: z.string().max(500).optional().nullable(),
});

// ─── Helper: resolve caller's role ───────────────────────────────────────────

async function getUserRole(userId: string): Promise<string | null> {
    const result = await query('SELECT role FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.role ?? null;
}

// ─── GET /api/v1/marketplace/listings ────────────────────────────────────────
// Public browse: active listings visible to all authenticated users.

router.get('/listings', requireAuth, async (req, res, next) => {
    try {
        const { species, stage, district } = req.query;

        const conditions: string[] = [`fl.status = 'ACTIVE'`];
        const params: unknown[] = [];

        if (stage) {
            params.push(stage);
            conditions.push(`fl.stage = $${params.length}`);
        }
        if (species) {
            params.push(`%${species}%`);
            conditions.push(`fl.species_name ILIKE $${params.length}`);
        }
        if (district) {
            params.push(`%${district}%`);
            conditions.push(`(h.district ILIKE $${params.length})`);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const result = await query(`
            SELECT
                fl.id,
                fl.stage,
                fl.species_name,
                fl.species_variant,
                fl.description,
                fl.total_quantity,
                fl.quantity_available,
                fl.min_order_qty,
                fl.price_per_piece,
                fl.status,
                fl.created_at,
                fl.updated_at,
                h.id          AS hatchery_id,
                h.name        AS hatchery_name,
                h.district    AS hatchery_district,
                h.block       AS hatchery_block,
                u.name        AS operator_name,
                u.phone_number AS operator_phone,
                COUNT(fo.id)  AS total_orders
            FROM fingerling_listings fl
            JOIN hatcheries h  ON h.id = fl.hatchery_id
            JOIN users u       ON u.id = h.operator_id
            LEFT JOIN fingerling_orders fo ON fo.listing_id = fl.id
                AND fo.status NOT IN ('CANCELLED')
            ${whereClause}
            GROUP BY fl.id, h.id, h.name, h.district, h.block, u.name, u.phone_number
            ORDER BY fl.created_at DESC
            LIMIT 100
        `, params);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

// ─── GET /api/v1/marketplace/listings/mine ───────────────────────────────────
// Hatchery operator sees their own listings (all statuses).
// MUST be defined before /:id to avoid route shadowing.

router.get('/listings/mine', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;

        const result = await query(`
            SELECT
                fl.id,
                fl.stage,
                fl.species_name,
                fl.species_variant,
                fl.total_quantity,
                fl.quantity_available,
                fl.min_order_qty,
                fl.price_per_piece,
                fl.status,
                fl.created_at,
                fl.updated_at,
                COUNT(fo.id) FILTER (WHERE fo.status NOT IN ('CANCELLED'))     AS active_orders,
                COUNT(fo.id) FILTER (WHERE fo.status = 'HATCHERY_CONFIRMED')   AS confirmed_orders,
                COALESCE(SUM(fo.total_amount) FILTER (WHERE fo.status = 'HATCHERY_CONFIRMED'), 0) AS total_revenue
            FROM fingerling_listings fl
            JOIN hatcheries h ON h.id = fl.hatchery_id
            LEFT JOIN fingerling_orders fo ON fo.listing_id = fl.id
            WHERE h.operator_id = $1
            GROUP BY fl.id
            ORDER BY fl.created_at DESC
        `, [userId]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

// ─── GET /api/v1/marketplace/listings/:id ────────────────────────────────────
// Listing detail with hatchery info.

router.get('/listings/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await query(`
            SELECT
                fl.*,
                h.id          AS hatchery_id,
                h.name        AS hatchery_name,
                h.district    AS hatchery_district,
                h.block       AS hatchery_block,
                h.panchayat   AS hatchery_panchayat,
                u.name        AS operator_name,
                u.phone_number AS operator_phone
            FROM fingerling_listings fl
            JOIN hatcheries h  ON h.id = fl.hatchery_id
            JOIN users u       ON u.id = h.operator_id
            WHERE fl.id = $1
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ success: false, error: 'Listing not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── POST /api/v1/marketplace/listings ───────────────────────────────────────
// Hatchery operator creates a new listing.

router.post('/listings', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const data = createListingSchema.parse(req.body);

        // Caller must own a hatchery
        const hatcheryRes = await query(
            'SELECT id FROM hatcheries WHERE operator_id = $1 LIMIT 1',
            [userId],
        );
        if (!hatcheryRes.rows.length) {
            return res.status(403).json({ success: false, error: 'No hatchery found for this account.' });
        }
        const hatcheryId = hatcheryRes.rows[0].id;

        // If batch_id provided, verify it belongs to this hatchery
        if (data.batch_id) {
            const batchRes = await query(
                'SELECT id FROM hatchery_batches WHERE id = $1 AND hatchery_id = $2',
                [data.batch_id, hatcheryId],
            );
            if (!batchRes.rows.length) {
                return res.status(400).json({ success: false, error: 'Batch not found or does not belong to your hatchery.' });
            }
        }

        const result = await query(`
            INSERT INTO fingerling_listings (
                hatchery_id, batch_id, stage, species_name, species_variant,
                description, total_quantity, quantity_available, min_order_qty, price_per_piece
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9)
            RETURNING *
        `, [
            hatcheryId,
            data.batch_id ?? null,
            data.stage,
            data.species_name,
            data.species_variant ?? null,
            data.description ?? null,
            data.total_quantity,
            data.min_order_qty,
            data.price_per_piece,
        ]);

        logger.info('Marketplace listing created', { listingId: result.rows[0].id, hatcheryId });
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── PATCH /api/v1/marketplace/listings/:id/cancel ───────────────────────────
// Hatchery operator cancels (soft-deletes) a listing.

router.patch('/listings/:id/cancel', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        // Verify ownership via hatchery
        const ownershipCheck = await query(`
            SELECT fl.id FROM fingerling_listings fl
            JOIN hatcheries h ON h.id = fl.hatchery_id
            WHERE fl.id = $1 AND h.operator_id = $2
        `, [id, userId]);

        if (!ownershipCheck.rows.length) {
            return res.status(403).json({ success: false, error: 'Access denied or listing not found.' });
        }

        const result = await query(`
            UPDATE fingerling_listings
            SET status = 'CANCELLED', updated_at = NOW()
            WHERE id = $1
            RETURNING id, status
        `, [id]);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── POST /api/v1/marketplace/orders ─────────────────────────────────────────
// Farmer places an order on an active listing.

router.post('/orders', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;

        // Only farmers can place orders
        const role = await getUserRole(userId);
        if (role !== 'FARMER') {
            return res.status(403).json({ success: false, error: 'Only farmers can place orders.' });
        }

        const data = placeOrderSchema.parse(req.body);

        const order = await transaction(async (client) => {
            // Lock the listing row for update
            const listingRes = await client.query(`
                SELECT fl.id, fl.quantity_available, fl.min_order_qty,
                       fl.price_per_piece, fl.status, fl.species_name, fl.stage,
                       u.uid AS farmer_uid
                FROM fingerling_listings fl
                LEFT JOIN users u ON u.id = $2
                WHERE fl.id = $1
                FOR UPDATE
            `, [data.listing_id, userId]);

            if (!listingRes.rows.length) {
                throw Object.assign(new Error('Listing not found.'), { status: 404 });
            }

            const listing = listingRes.rows[0];

            if (listing.status !== 'ACTIVE') {
                throw Object.assign(
                    new Error(`Listing is ${listing.status.toLowerCase()} and cannot be ordered.`),
                    { status: 400 },
                );
            }
            if (data.quantity_ordered > listing.quantity_available) {
                throw Object.assign(
                    new Error(`Only ${listing.quantity_available} pieces available.`),
                    { status: 400 },
                );
            }
            if (data.quantity_ordered < listing.min_order_qty) {
                throw Object.assign(
                    new Error(`Minimum order quantity is ${listing.min_order_qty} pieces.`),
                    { status: 400 },
                );
            }

            const totalAmount = parseFloat(listing.price_per_piece) * data.quantity_ordered;

            // Reduce available quantity
            const newQty = listing.quantity_available - data.quantity_ordered;
            const newStatus = newQty === 0 ? 'SOLD_OUT' : 'ACTIVE';
            await client.query(`
                UPDATE fingerling_listings
                SET quantity_available = $1, status = $2, updated_at = NOW()
                WHERE id = $3
            `, [newQty, newStatus, data.listing_id]);

            // Create the order
            const orderRes = await client.query(`
                INSERT INTO fingerling_orders (
                    listing_id, farmer_id, farmer_uid,
                    quantity_ordered, price_per_piece, total_amount,
                    farmer_notes, delivery_address
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [
                data.listing_id,
                userId,
                listing.farmer_uid ?? null,
                data.quantity_ordered,
                listing.price_per_piece,
                totalAmount,
                data.farmer_notes ?? null,
                data.delivery_address ?? null,
            ]);

            return orderRes.rows[0];
        });

        logger.info('Marketplace order placed', { orderId: order.id, farmerId: userId });
        res.status(201).json({ success: true, data: order });
    } catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        next(error);
    }
});

// ─── GET /api/v1/marketplace/orders/mine ─────────────────────────────────────
// Farmers see orders they placed; hatchery operators see orders on their listings.
// MUST be defined before /:id.

router.get('/orders/mine', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const role = await getUserRole(userId);

        let result;
        if (role === 'FARMER') {
            result = await query(`
                SELECT
                    fo.id,
                    fo.quantity_ordered,
                    fo.price_per_piece,
                    fo.total_amount,
                    fo.status,
                    fo.farmer_notes,
                    fo.farmer_paid_at,
                    fo.hatchery_confirmed_at,
                    fo.created_at,
                    fo.updated_at,
                    fl.species_name,
                    fl.species_variant,
                    fl.stage,
                    fl.id          AS listing_id,
                    h.name         AS hatchery_name,
                    h.district     AS hatchery_district,
                    u.name         AS operator_name,
                    u.phone_number AS operator_phone
                FROM fingerling_orders fo
                JOIN fingerling_listings fl ON fl.id = fo.listing_id
                JOIN hatcheries h           ON h.id  = fl.hatchery_id
                JOIN users u                ON u.id  = h.operator_id
                WHERE fo.farmer_id = $1
                ORDER BY fo.created_at DESC
            `, [userId]);
        } else {
            // Hatchery operator — see incoming orders
            result = await query(`
                SELECT
                    fo.id,
                    fo.quantity_ordered,
                    fo.price_per_piece,
                    fo.total_amount,
                    fo.status,
                    fo.farmer_notes,
                    fo.delivery_address,
                    fo.farmer_paid_at,
                    fo.hatchery_confirmed_at,
                    fo.created_at,
                    fo.updated_at,
                    fl.species_name,
                    fl.species_variant,
                    fl.stage,
                    fl.id          AS listing_id,
                    uf.name        AS farmer_name,
                    uf.phone_number AS farmer_phone,
                    uf.uid         AS farmer_uid
                FROM fingerling_orders fo
                JOIN fingerling_listings fl ON fl.id = fo.listing_id
                JOIN hatcheries h           ON h.id  = fl.hatchery_id
                JOIN users uf               ON uf.id = fo.farmer_id
                WHERE h.operator_id = $1
                ORDER BY fo.created_at DESC
            `, [userId]);
        }

        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

// ─── PATCH /api/v1/marketplace/orders/:id/pay ────────────────────────────────
// Farmer confirms they have paid (off-platform, e.g. bank transfer).

router.patch('/orders/:id/pay', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const ownerCheck = await query(
            `SELECT id, status FROM fingerling_orders WHERE id = $1 AND farmer_id = $2`,
            [id, userId],
        );
        if (!ownerCheck.rows.length) {
            return res.status(404).json({ success: false, error: 'Order not found.' });
        }
        if (ownerCheck.rows[0].status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                error: `Order is already ${ownerCheck.rows[0].status.toLowerCase()}.`,
            });
        }

        const result = await query(`
            UPDATE fingerling_orders
            SET status = 'FARMER_PAID', farmer_paid_at = NOW(), updated_at = NOW()
            WHERE id = $1
            RETURNING id, status, farmer_paid_at
        `, [id]);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── PATCH /api/v1/marketplace/orders/:id/confirm ────────────────────────────
// Hatchery operator confirms that payment has been received.

router.patch('/orders/:id/confirm', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        // Verify this order is for a listing owned by this hatchery
        const ownerCheck = await query(`
            SELECT fo.id, fo.status
            FROM fingerling_orders fo
            JOIN fingerling_listings fl ON fl.id = fo.listing_id
            JOIN hatcheries h           ON h.id  = fl.hatchery_id
            WHERE fo.id = $1 AND h.operator_id = $2
        `, [id, userId]);

        if (!ownerCheck.rows.length) {
            return res.status(404).json({ success: false, error: 'Order not found.' });
        }
        const currentStatus = ownerCheck.rows[0].status;
        if (!['FARMER_PAID', 'PENDING'].includes(currentStatus)) {
            return res.status(400).json({
                success: false,
                error: `Cannot confirm an order with status ${currentStatus}.`,
            });
        }

        const result = await query(`
            UPDATE fingerling_orders
            SET status = 'HATCHERY_CONFIRMED', hatchery_confirmed_at = NOW(), updated_at = NOW()
            WHERE id = $1
            RETURNING id, status, hatchery_confirmed_at
        `, [id]);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── PATCH /api/v1/marketplace/orders/:id/cancel ─────────────────────────────
// Farmer or hatchery can cancel a PENDING order. Restores listing quantity.

router.patch('/orders/:id/cancel', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        await transaction(async (client) => {
            // Check access: farmer owns it OR hatchery operator owns the listing
            const orderRes = await client.query(`
                SELECT fo.id, fo.status, fo.listing_id, fo.quantity_ordered,
                       fo.farmer_id, h.operator_id
                FROM fingerling_orders fo
                JOIN fingerling_listings fl ON fl.id = fo.listing_id
                JOIN hatcheries h           ON h.id  = fl.hatchery_id
                WHERE fo.id = $1
                FOR UPDATE
            `, [id]);

            if (!orderRes.rows.length) {
                throw Object.assign(new Error('Order not found.'), { status: 404 });
            }

            const order = orderRes.rows[0];
            const isFarmer = order.farmer_id === userId;
            const isHatchery = order.operator_id === userId;

            if (!isFarmer && !isHatchery) {
                throw Object.assign(new Error('Access denied.'), { status: 403 });
            }
            if (!['PENDING', 'FARMER_PAID'].includes(order.status)) {
                throw Object.assign(
                    new Error(`Cannot cancel an order with status ${order.status}.`),
                    { status: 400 },
                );
            }

            // Restore quantity to listing
            await client.query(`
                UPDATE fingerling_listings
                SET quantity_available = quantity_available + $1,
                    status = CASE WHEN status = 'SOLD_OUT' THEN 'ACTIVE' ELSE status END,
                    updated_at = NOW()
                WHERE id = $2
            `, [order.quantity_ordered, order.listing_id]);

            // Cancel the order
            await client.query(`
                UPDATE fingerling_orders
                SET status = 'CANCELLED', updated_at = NOW()
                WHERE id = $1
            `, [id]);
        });

        res.json({ success: true, data: { id, status: 'CANCELLED' } });
    } catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        next(error);
    }
});

export { router as marketplaceRouter };

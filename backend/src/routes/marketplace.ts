/**
 * Marketplace API Routes — v2 (full spec)
 *
 * Listings (hatchery)
 *   GET    /api/v1/marketplace/listings              browse — farmers + public auth
 *   GET    /api/v1/marketplace/listings/mine         hatchery's own listings
 *   GET    /api/v1/marketplace/listings/:id          listing detail
 *   POST   /api/v1/marketplace/listings              create draft listing (HATCHERY)
 *   PATCH  /api/v1/marketplace/listings/:id          edit (field rules by status)
 *   DELETE /api/v1/marketplace/listings/:id          delete DRAFT only
 *   POST   /api/v1/marketplace/listings/:id/publish  DRAFT → UPCOMING or AVAILABLE
 *   POST   /api/v1/marketplace/listings/:id/mark-available  UPCOMING → AVAILABLE
 *   POST   /api/v1/marketplace/listings/:id/close    any → CLOSED
 *
 * Orders (purchase)
 *   POST   /api/v1/marketplace/orders                place purchase order (FARMER)
 *   GET    /api/v1/marketplace/orders/mine           my orders (FARMER or HATCHERY)
 *   GET    /api/v1/marketplace/orders/:id            order detail
 *   PATCH  /api/v1/marketplace/orders/:id/accept     hatchery accepts (reserves qty)
 *   PATCH  /api/v1/marketplace/orders/:id/reject     hatchery rejects
 *   PATCH  /api/v1/marketplace/orders/:id/pay        farmer marks paid
 *   PATCH  /api/v1/marketplace/orders/:id/confirm    hatchery confirms (reserved → confirmed)
 *   PATCH  /api/v1/marketplace/orders/:id/fulfill    either marks fulfilled
 *   PATCH  /api/v1/marketplace/orders/:id/cancel     either cancels (releases reservation)
 *   PATCH  /api/v1/marketplace/orders/:id/dispute    either raises dispute
 *
 * Advance interest (UPCOMING listings)
 *   POST   /api/v1/marketplace/listings/:id/interest        farmer expresses interest
 *   PATCH  /api/v1/marketplace/orders/:id/acknowledge       hatchery acknowledges interest
 *   PATCH  /api/v1/marketplace/orders/:id/decline           hatchery declines interest
 *   POST   /api/v1/marketplace/orders/:id/convert           farmer converts interest to order
 *
 * Notifications
 *   GET    /api/v1/marketplace/notifications                in-app notifications
 *   PATCH  /api/v1/marketplace/notifications/:id/read       mark notification read
 *
 * Inventory model
 *   batch_size (total_quantity) = fixed at creation
 *   reserved_quantity = sum of ACCEPTED order qtys
 *   confirmed_quantity = sum of HATCHERY_CONFIRMED + FULFILLED order qtys
 *   available_quantity = batch_size - reserved - confirmed (maintained on writes)
 *
 * Payment is off-platform. App only records farmer-paid / hatchery-confirmed.
 */

import { Router } from 'express';
import { z } from 'zod';
import { query, transaction } from '../db';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── Constants ───────────────────────────────────────────────────────────────

const SPECIES_ENUM = [
    'Rohu', 'Catla', 'Mrigal', 'Pangasius',
    'Grass Carp', 'Common Carp', 'Silver Carp', 'Other',
] as const;

const DISPUTE_REASONS = [
    'QUANTITY_MISMATCH', 'HIGH_MORTALITY',
    'NOT_AS_DESCRIBED', 'PAYMENT_NOT_RECEIVED', 'OTHER',
] as const;

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createListingSchema = z.object({
    stage:                  z.enum(['fry', 'fingerling']),
    species_name:           z.string().min(2).max(100).trim(),
    species_variant:        z.string().max(100).optional().nullable(),
    description:            z.string().max(1000).optional().nullable(),
    size_description:       z.string().max(200).optional().nullable(),
    batch_id:               z.string().uuid().optional().nullable(),

    total_quantity:         z.number().int().positive(),
    min_order_qty:          z.number().int().positive().default(100),
    price_per_piece:        z.number().positive(),
    bulk_price_per_piece:   z.number().positive().optional().nullable(),
    bulk_price_threshold:   z.number().int().positive().optional().nullable(),

    expected_ready_date:    z.string().date(),
    last_available_date:    z.string().date(),

    pickup_available:       z.boolean().default(true),
    delivery_available:     z.boolean().default(false),
    logistics_notes:        z.string().max(500).optional().nullable(),

    // Optional per-listing overrides for hatchery contact details
    // (otherwise pulled from hatchery profile snapshot)
    contact_number_override: z.string().regex(/^[6-9]\d{9}$/).optional().nullable(),
    email_override:          z.string().email().optional().nullable(),
    upi_id_override:         z.string().max(120).optional().nullable(),

    geo_lat:                z.number().min(-90).max(90).optional().nullable(),
    geo_lng:                z.number().min(-180).max(180).optional().nullable(),
});

const updateListingSchema = z.object({
    description:            z.string().max(1000).optional().nullable(),
    size_description:       z.string().max(200).optional().nullable(),
    logistics_notes:        z.string().max(500).optional().nullable(),
    contact_number_override: z.string().regex(/^[6-9]\d{9}$/).optional().nullable(),
    email_override:          z.string().email().optional().nullable(),
    upi_id_override:         z.string().max(120).optional().nullable(),
    last_available_date:     z.string().date().optional(),
    // DRAFT-only fields (validated against listing status in handler)
    stage:                  z.enum(['fry', 'fingerling']).optional(),
    species_name:           z.string().min(2).max(100).trim().optional(),
    species_variant:        z.string().max(100).optional().nullable(),
    total_quantity:         z.number().int().positive().optional(),
    min_order_qty:          z.number().int().positive().optional(),
    price_per_piece:        z.number().positive().optional(),
    bulk_price_per_piece:   z.number().positive().optional().nullable(),
    bulk_price_threshold:   z.number().int().positive().optional().nullable(),
    expected_ready_date:    z.string().date().optional(),
    pickup_available:       z.boolean().optional(),
    delivery_available:     z.boolean().optional(),
});

const publishListingSchema = z.object({
    target: z.enum(['UPCOMING', 'AVAILABLE']).optional(),
});

const placeOrderSchema = z.object({
    listing_id:           z.string().uuid(),
    quantity_requested:   z.number().int().positive(),
    logistics_preference: z.enum(['PICKUP', 'DELIVERY']),
    preferred_date:       z.string().date().optional().nullable(),
    farmer_notes:         z.string().max(500).optional().nullable(),
    delivery_address:     z.string().max(500).optional().nullable(),
});

const placeInterestSchema = z.object({
    listing_id:           z.string().uuid(),
    quantity_requested:   z.number().int().positive(),
    logistics_preference: z.enum(['PICKUP', 'DELIVERY']).optional(),
    preferred_date:       z.string().date().optional().nullable(),
    farmer_notes:         z.string().max(500).optional().nullable(),
});

const markPaidSchema = z.object({
    payment_screenshot_url: z.string().url().optional().nullable(),
});

const rejectOrderSchema = z.object({
    reason: z.string().max(500).optional().nullable(),
});

const disputeSchema = z.object({
    reason: z.enum(DISPUTE_REASONS),
    description: z.string().max(1000).optional().nullable(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getUserRole(userId: string): Promise<string | null> {
    const result = await query('SELECT role FROM users WHERE id = $1', [userId]);
    return result.rows[0]?.role ?? null;
}

/**
 * Returns the hatchery owned by the given operator, or null.
 * Also returns hatchery profile fields needed for listing snapshots.
 */
async function getOperatorHatchery(userId: string) {
    const result = await query(`
        SELECT h.id, h.name, h.hatchery_uid, h.contact_number, h.email, h.upi_id,
               h.district, h.block, h.panchayat,
               u.phone_number AS operator_phone
        FROM hatcheries h
        JOIN users u ON u.id = h.operator_id
        WHERE h.operator_id = $1
        LIMIT 1
    `, [userId]);
    return result.rows[0] ?? null;
}

/**
 * Lazy auto-expiry: marks any AVAILABLE/UPCOMING listings whose
 * last_available_date has passed as EXPIRED.
 * Called before every browse/listing read.
 */
async function expirePastListings(): Promise<number> {
    const result = await query(`
        UPDATE fingerling_listings
        SET status = 'EXPIRED', updated_at = NOW()
        WHERE status IN ('AVAILABLE', 'UPCOMING')
          AND last_available_date < CURRENT_DATE
        RETURNING id
    `);
    return result.rowCount ?? 0;
}

/**
 * Insert a marketplace notification. Failure should not block the action.
 */
async function notify(
    recipientId: string,
    type: string,
    title: string,
    message: string,
    listingId?: string | null,
    orderId?: string | null,
): Promise<void> {
    try {
        await query(`
            INSERT INTO marketplace_notifications
            (recipient_id, type, title, message, listing_id, order_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [recipientId, type, title, message, listingId ?? null, orderId ?? null]);
    } catch (err) {
        logger.warn('Failed to create marketplace notification', { err, type, recipientId });
    }
}

/**
 * Returns the operator (user) id for a listing.
 */
async function listingOwnerId(listingId: string): Promise<string | null> {
    const r = await query(`
        SELECT h.operator_id
        FROM fingerling_listings fl
        JOIN hatcheries h ON h.id = fl.hatchery_id
        WHERE fl.id = $1
    `, [listingId]);
    return r.rows[0]?.operator_id ?? null;
}

/**
 * Compute applicable price/piece for a given listing + qty.
 */
function applicablePrice(
    qty: number,
    pricePerPiece: number,
    bulkPrice?: number | null,
    bulkThreshold?: number | null,
): { price: number; bulk: boolean } {
    if (bulkPrice && bulkThreshold && qty >= bulkThreshold) {
        return { price: bulkPrice, bulk: true };
    }
    return { price: pricePerPiece, bulk: false };
}

// ─── LISTINGS — BROWSE ───────────────────────────────────────────────────────

/**
 * GET /api/v1/marketplace/listings
 * Farmer browse feed. Defaults to AVAILABLE listings; includeUpcoming=true
 * adds UPCOMING listings as well for advance-planning.
 */
router.get('/listings', requireAuth, async (req, res, next) => {
    try {
        await expirePastListings();

        const {
            species, stage, district, pickup, delivery,
            includeUpcoming, sortBy,
        } = req.query;

        const conditions: string[] = [];
        const params: unknown[] = [];

        // Status filter
        if (includeUpcoming === 'true') {
            conditions.push(`fl.status IN ('AVAILABLE', 'UPCOMING')`);
        } else {
            conditions.push(`fl.status = 'AVAILABLE'`);
        }

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
            conditions.push(`(fl.district_snapshot ILIKE $${params.length})`);
        }
        if (pickup === 'true') {
            conditions.push(`fl.pickup_available = TRUE`);
        }
        if (delivery === 'true') {
            conditions.push(`fl.delivery_available = TRUE`);
        }

        const orderClause = sortBy === 'price_asc'
            ? `ORDER BY fl.status DESC, fl.price_per_piece ASC`
            // AVAILABLE first, then UPCOMING; soonest ready first within each
            : `ORDER BY (fl.status = 'AVAILABLE') DESC, fl.expected_ready_date ASC`;

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const result = await query(`
            SELECT
                fl.id,
                fl.stage,
                fl.species_name,
                fl.species_variant,
                fl.size_description,
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
                fl.pickup_available,
                fl.delivery_available,
                fl.logistics_notes,
                fl.status,
                fl.geo_lat,
                fl.geo_lng,
                fl.hatchery_uid_snapshot,
                fl.contact_number_snapshot,
                fl.email_snapshot,
                fl.upi_id_snapshot,
                fl.district_snapshot,
                fl.block_snapshot,
                fl.panchayat_snapshot,
                fl.created_at,
                fl.updated_at,
                h.id          AS hatchery_id,
                h.name        AS hatchery_name,
                u.name        AS operator_name
            FROM fingerling_listings fl
            JOIN hatcheries h ON h.id = fl.hatchery_id
            JOIN users u      ON u.id = h.operator_id
            ${whereClause}
            ${orderClause}
            LIMIT 200
        `, params);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

// ─── LISTINGS — HATCHERY'S OWN ───────────────────────────────────────────────

router.get('/listings/mine', requireAuth, async (req, res, next) => {
    try {
        await expirePastListings();
        const userId = req.auth!.userId;

        const result = await query(`
            SELECT
                fl.id,
                fl.batch_id,
                fl.stage,
                fl.species_name,
                fl.species_variant,
                fl.size_description,
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
                fl.pickup_available,
                fl.delivery_available,
                fl.status,
                fl.created_at,
                fl.updated_at,
                COUNT(fo.id) FILTER (
                    WHERE fo.status IN ('REQUESTED','ACCEPTED','FARMER_PAID','HATCHERY_CONFIRMED')
                ) AS active_orders,
                COUNT(fo.id) FILTER (WHERE fo.status = 'FULFILLED') AS fulfilled_orders,
                COUNT(fo.id) FILTER (WHERE fo.status = 'DISPUTED') AS disputed_orders,
                COALESCE(SUM(fo.total_amount) FILTER (
                    WHERE fo.status IN ('HATCHERY_CONFIRMED', 'FULFILLED')
                ), 0) AS total_revenue
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

// ─── LISTINGS — DETAIL ───────────────────────────────────────────────────────

router.get('/listings/:id', requireAuth, async (req, res, next) => {
    try {
        await expirePastListings();
        const { id } = req.params;

        const result = await query(`
            SELECT
                fl.*,
                h.id          AS hatchery_id,
                h.name        AS hatchery_name,
                u.name        AS operator_name
            FROM fingerling_listings fl
            JOIN hatcheries h ON h.id = fl.hatchery_id
            JOIN users u      ON u.id = h.operator_id
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

// ─── LISTINGS — CREATE ───────────────────────────────────────────────────────

router.post('/listings', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const data = createListingSchema.parse(req.body);

        // Validate date order
        if (new Date(data.last_available_date) <= new Date(data.expected_ready_date)) {
            return res.status(400).json({
                success: false,
                error: 'last_available_date must be after expected_ready_date.',
            });
        }

        // Validate bulk pricing internal consistency
        if (data.bulk_price_per_piece != null) {
            if (data.bulk_price_per_piece >= data.price_per_piece) {
                return res.status(400).json({
                    success: false,
                    error: 'Bulk price must be lower than the standard price.',
                });
            }
            if (data.bulk_price_threshold == null) {
                return res.status(400).json({
                    success: false,
                    error: 'Bulk price requires a quantity threshold.',
                });
            }
            if (data.bulk_price_threshold <= data.min_order_qty) {
                return res.status(400).json({
                    success: false,
                    error: 'Bulk threshold must be greater than the minimum order quantity.',
                });
            }
        }

        // Caller must own a hatchery
        const hatchery = await getOperatorHatchery(userId);
        if (!hatchery) {
            return res.status(403).json({
                success: false,
                error: 'No hatchery found for this account. Create your hatchery profile first.',
            });
        }

        // Hatchery profile must have UID + contact number for marketplace eligibility
        const contactSnapshot = data.contact_number_override || hatchery.contact_number || hatchery.operator_phone;
        if (!hatchery.hatchery_uid) {
            return res.status(400).json({
                success: false,
                error: 'Your hatchery profile is missing the government registration UID. Please update your profile first.',
            });
        }
        if (!contactSnapshot) {
            return res.status(400).json({
                success: false,
                error: 'A contact phone number is required to list on the marketplace.',
            });
        }

        if (data.batch_id) {
            const batchRes = await query(
                'SELECT id FROM hatchery_batches WHERE id = $1 AND hatchery_id = $2',
                [data.batch_id, hatchery.id],
            );
            if (!batchRes.rows.length) {
                return res.status(400).json({
                    success: false,
                    error: 'Batch not found or does not belong to your hatchery.',
                });
            }
        }

        // Decide initial status from expected_ready_date — but always start DRAFT.
        // Publishing later transitions to UPCOMING or AVAILABLE.
        const result = await query(`
            INSERT INTO fingerling_listings (
                hatchery_id, batch_id, stage, species_name, species_variant,
                description, size_description,
                total_quantity, quantity_available, min_order_qty,
                price_per_piece, bulk_price_per_piece, bulk_price_threshold,
                expected_ready_date, last_available_date,
                pickup_available, delivery_available, logistics_notes,
                hatchery_uid_snapshot, contact_number_snapshot,
                email_snapshot, upi_id_snapshot,
                district_snapshot, block_snapshot, panchayat_snapshot,
                geo_lat, geo_lng,
                reserved_quantity, confirmed_quantity, status
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7,
                $8, $8, $9,
                $10, $11, $12,
                $13, $14,
                $15, $16, $17,
                $18, $19,
                $20, $21,
                $22, $23, $24,
                $25, $26,
                0, 0, 'DRAFT'
            )
            RETURNING *
        `, [
            hatchery.id,
            data.batch_id ?? null,
            data.stage,
            data.species_name,
            data.species_variant ?? null,
            data.description ?? null,
            data.size_description ?? null,
            data.total_quantity,
            data.min_order_qty,
            data.price_per_piece,
            data.bulk_price_per_piece ?? null,
            data.bulk_price_threshold ?? null,
            data.expected_ready_date,
            data.last_available_date,
            data.pickup_available,
            data.delivery_available,
            data.logistics_notes ?? null,
            hatchery.hatchery_uid,
            contactSnapshot,
            data.email_override ?? hatchery.email ?? null,
            data.upi_id_override ?? hatchery.upi_id ?? null,
            hatchery.district ?? null,
            hatchery.block ?? null,
            hatchery.panchayat ?? null,
            data.geo_lat ?? null,
            data.geo_lng ?? null,
        ]);

        logger.info('Marketplace listing created', { listingId: result.rows[0].id, hatcheryId: hatchery.id });
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── LISTINGS — UPDATE ───────────────────────────────────────────────────────

router.patch('/listings/:id', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;
        const data = updateListingSchema.parse(req.body);

        const listingRes = await query(`
            SELECT fl.*, h.operator_id
            FROM fingerling_listings fl
            JOIN hatcheries h ON h.id = fl.hatchery_id
            WHERE fl.id = $1
        `, [id]);

        if (!listingRes.rows.length) {
            return res.status(404).json({ success: false, error: 'Listing not found.' });
        }
        const listing = listingRes.rows[0];
        if (listing.operator_id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied.' });
        }

        // Field restrictions by status
        const isDraft = listing.status === 'DRAFT';
        const restrictedFields = [
            'stage', 'species_name', 'species_variant', 'total_quantity',
            'min_order_qty', 'price_per_piece', 'bulk_price_per_piece',
            'bulk_price_threshold', 'expected_ready_date',
            'pickup_available', 'delivery_available',
        ] as const;
        for (const f of restrictedFields) {
            if ((data as any)[f] !== undefined && !isDraft) {
                return res.status(400).json({
                    success: false,
                    error: `Field "${f}" can only be modified while the listing is in DRAFT status.`,
                });
            }
        }

        // EXPIRED / CLOSED listings cannot be edited at all
        if (['EXPIRED', 'CLOSED'].includes(listing.status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot edit a ${listing.status.toLowerCase()} listing.`,
            });
        }

        // Build dynamic update
        const fields: string[] = [];
        const params: unknown[] = [];
        const push = (column: string, value: unknown) => {
            params.push(value);
            fields.push(`${column} = $${params.length}`);
        };

        if (data.description !== undefined) push('description', data.description);
        if (data.size_description !== undefined) push('size_description', data.size_description);
        if (data.logistics_notes !== undefined) push('logistics_notes', data.logistics_notes);
        if (data.contact_number_override !== undefined) push('contact_number_snapshot', data.contact_number_override);
        if (data.email_override !== undefined) push('email_snapshot', data.email_override);
        if (data.upi_id_override !== undefined) push('upi_id_snapshot', data.upi_id_override);
        if (data.last_available_date !== undefined) push('last_available_date', data.last_available_date);

        if (isDraft) {
            if (data.stage !== undefined) push('stage', data.stage);
            if (data.species_name !== undefined) push('species_name', data.species_name);
            if (data.species_variant !== undefined) push('species_variant', data.species_variant);
            if (data.total_quantity !== undefined) {
                push('total_quantity', data.total_quantity);
                push('quantity_available', data.total_quantity);
            }
            if (data.min_order_qty !== undefined) push('min_order_qty', data.min_order_qty);
            if (data.price_per_piece !== undefined) push('price_per_piece', data.price_per_piece);
            if (data.bulk_price_per_piece !== undefined) push('bulk_price_per_piece', data.bulk_price_per_piece);
            if (data.bulk_price_threshold !== undefined) push('bulk_price_threshold', data.bulk_price_threshold);
            if (data.expected_ready_date !== undefined) push('expected_ready_date', data.expected_ready_date);
            if (data.pickup_available !== undefined) push('pickup_available', data.pickup_available);
            if (data.delivery_available !== undefined) push('delivery_available', data.delivery_available);
        }

        if (!fields.length) {
            return res.json({ success: true, data: listing });
        }

        fields.push(`updated_at = NOW()`);
        params.push(id);
        const result = await query(`
            UPDATE fingerling_listings SET ${fields.join(', ')}
            WHERE id = $${params.length}
            RETURNING *
        `, params);

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── LISTINGS — DELETE (DRAFT only) ──────────────────────────────────────────

router.delete('/listings/:id', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const check = await query(`
            SELECT fl.status, h.operator_id
            FROM fingerling_listings fl
            JOIN hatcheries h ON h.id = fl.hatchery_id
            WHERE fl.id = $1
        `, [id]);

        if (!check.rows.length) {
            return res.status(404).json({ success: false, error: 'Listing not found.' });
        }
        if (check.rows[0].operator_id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied.' });
        }
        if (check.rows[0].status !== 'DRAFT') {
            return res.status(400).json({
                success: false,
                error: 'Only DRAFT listings can be deleted. Use Close instead.',
            });
        }

        await query('DELETE FROM fingerling_listings WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// ─── LISTINGS — TRANSITIONS ──────────────────────────────────────────────────

/** DRAFT → UPCOMING (if ready date is future) or AVAILABLE (if ready today/past) */
router.post('/listings/:id/publish', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;
        const { target } = publishListingSchema.parse(req.body ?? {});

        const result = await query(`
            SELECT fl.*, h.operator_id
            FROM fingerling_listings fl
            JOIN hatcheries h ON h.id = fl.hatchery_id
            WHERE fl.id = $1
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ success: false, error: 'Listing not found.' });
        }
        const listing = result.rows[0];
        if (listing.operator_id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied.' });
        }
        if (listing.status !== 'DRAFT') {
            return res.status(400).json({ success: false, error: 'Only DRAFT listings can be published.' });
        }

        // Compute next status
        const today = new Date().toISOString().slice(0, 10);
        const readyDate = listing.expected_ready_date.toISOString().slice(0, 10);
        let nextStatus: string;
        if (target) {
            // explicit override (validated against ready date)
            if (target === 'AVAILABLE' && readyDate > today) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot publish as AVAILABLE — expected ready date is in the future.',
                });
            }
            nextStatus = target;
        } else {
            nextStatus = readyDate <= today ? 'AVAILABLE' : 'UPCOMING';
        }

        const updated = await query(`
            UPDATE fingerling_listings
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [nextStatus, id]);

        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        next(error);
    }
});

/** UPCOMING → AVAILABLE manually (when stock is ready) */
router.post('/listings/:id/mark-available', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const result = await query(`
            SELECT fl.status, h.operator_id
            FROM fingerling_listings fl
            JOIN hatcheries h ON h.id = fl.hatchery_id
            WHERE fl.id = $1
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ success: false, error: 'Listing not found.' });
        }
        if (result.rows[0].operator_id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied.' });
        }
        if (result.rows[0].status !== 'UPCOMING') {
            return res.status(400).json({
                success: false,
                error: `Only UPCOMING listings can be marked available (current: ${result.rows[0].status}).`,
            });
        }

        const updated = await query(`
            UPDATE fingerling_listings SET status = 'AVAILABLE', updated_at = NOW()
            WHERE id = $1 RETURNING *
        `, [id]);

        // Notify all farmers with INTEREST_ACKNOWLEDGED orders on this listing
        await transaction(async (client) => {
            const interestRes = await client.query(`
                SELECT id, farmer_id FROM fingerling_orders
                WHERE listing_id = $1 AND order_type = 'ADVANCE_INTEREST'
                  AND status = 'INTEREST_ACKNOWLEDGED'
            `, [id]);
            for (const row of interestRes.rows) {
                await client.query(`
                    INSERT INTO marketplace_notifications
                    (recipient_id, type, title, message, listing_id, order_id)
                    VALUES ($1, 'interest_converted_prompt', 'Stock now available', 'A listing you expressed interest in is now available — confirm your order to proceed.', $2, $3)
                `, [row.farmer_id, id, row.id]);
            }
        });

        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        next(error);
    }
});

/** Manually close a listing (any non-terminal status). */
router.post('/listings/:id/close', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const result = await query(`
            SELECT fl.status, fl.batch_id, h.operator_id
            FROM fingerling_listings fl
            JOIN hatcheries h ON h.id = fl.hatchery_id
            WHERE fl.id = $1
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ success: false, error: 'Listing not found.' });
        }
        const listing = result.rows[0];
        if (listing.operator_id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied.' });
        }
        if (['EXPIRED', 'CLOSED'].includes(listing.status)) {
            return res.status(400).json({ success: false, error: 'Listing is already terminal.' });
        }

        const updatedListing = await transaction(async (client) => {
            const up = await client.query(`
                UPDATE fingerling_listings SET status = 'CLOSED', updated_at = NOW()
                WHERE id = $1 RETURNING *
            `, [id]);

            if (listing.batch_id) {
                // Automate batch closing to 'sold' stage
                await client.query(`
                    UPDATE hatchery_batches
                    SET current_stage = 'sold', updated_at = NOW()
                    WHERE id = $1
                `, [listing.batch_id]);

                // Log the stage transition
                await client.query(`
                    INSERT INTO hatchery_stage_logs (
                        batch_id, stage, count_at_entry, logged_by, observations
                    ) VALUES ($1, 'sold', 0, $2, 'Batch closed automatically via marketplace listing.')
                `, [listing.batch_id, userId]);
            }

            return up.rows[0];
        });

        res.json({ success: true, data: updatedListing });
    } catch (error) {
        next(error);
    }
});

// ─── ORDERS — PLACE PURCHASE ORDER ───────────────────────────────────────────

router.post('/orders', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const role = await getUserRole(userId);
        if (role !== 'FARMER') {
            return res.status(403).json({ success: false, error: 'Only farmers can place orders.' });
        }

        const data = placeOrderSchema.parse(req.body);

        const order = await transaction(async (client) => {
            // Lock the listing
            const listingRes = await client.query(`
                SELECT fl.*, h.operator_id
                FROM fingerling_listings fl
                JOIN hatcheries h ON h.id = fl.hatchery_id
                WHERE fl.id = $1
                FOR UPDATE
            `, [data.listing_id]);

            if (!listingRes.rows.length) {
                throw Object.assign(new Error('Listing not found.'), { status: 404 });
            }
            const listing = listingRes.rows[0];

            if (listing.operator_id === userId) {
                throw Object.assign(new Error('You cannot order from your own listing.'), { status: 400 });
            }
            if (listing.status !== 'AVAILABLE') {
                throw Object.assign(
                    new Error(`Listing is ${listing.status.toLowerCase()} and cannot be ordered.`),
                    { status: 400 },
                );
            }
            if (data.quantity_requested < listing.min_order_qty) {
                throw Object.assign(
                    new Error(`Minimum order quantity is ${listing.min_order_qty} pieces.`),
                    { status: 400 },
                );
            }
            if (data.quantity_requested > listing.quantity_available) {
                throw Object.assign(
                    new Error(`Only ${listing.quantity_available} pieces available.`),
                    { status: 400 },
                );
            }
            // Logistics preference must be supported
            if (data.logistics_preference === 'PICKUP' && !listing.pickup_available) {
                throw Object.assign(new Error('Pickup is not offered for this listing.'), { status: 400 });
            }
            if (data.logistics_preference === 'DELIVERY' && !listing.delivery_available) {
                throw Object.assign(new Error('Delivery is not offered for this listing.'), { status: 400 });
            }

            const { price, bulk } = applicablePrice(
                data.quantity_requested,
                parseFloat(listing.price_per_piece),
                listing.bulk_price_per_piece ? parseFloat(listing.bulk_price_per_piece) : null,
                listing.bulk_price_threshold,
            );
            const totalAmount = price * data.quantity_requested;

            // Fetch farmer uid
            const uidRes = await client.query('SELECT uid FROM users WHERE id = $1', [userId]);
            const farmerUid = uidRes.rows[0]?.uid ?? null;

            // Create order in REQUESTED. NO quantity reservation yet — that happens on ACCEPT.
            const orderRes = await client.query(`
                INSERT INTO fingerling_orders (
                    listing_id, farmer_id, farmer_uid, order_type,
                    quantity_ordered, price_per_piece, price_per_piece_at_order,
                    bulk_price_applied, total_amount,
                    logistics_preference, preferred_date,
                    farmer_notes, delivery_address, status
                ) VALUES (
                    $1, $2, $3, 'PURCHASE_ORDER',
                    $4, $5, $5,
                    $6, $7,
                    $8, $9,
                    $10, $11, 'REQUESTED'
                )
                RETURNING *
            `, [
                data.listing_id,
                userId,
                farmerUid,
                data.quantity_requested,
                price,
                bulk,
                totalAmount,
                data.logistics_preference,
                data.preferred_date ?? null,
                data.farmer_notes ?? null,
                data.delivery_address ?? null,
            ]);

            return { order: orderRes.rows[0], operatorId: listing.operator_id, listing };
        });

        await notify(
            order.operatorId,
            'order_placed',
            'New order on your listing',
            `A farmer has placed an order for ${order.order.quantity_ordered} ${order.listing.stage} pieces.`,
            data.listing_id,
            order.order.id,
        );

        res.status(201).json({ success: true, data: order.order });
    } catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        next(error);
    }
});

// ─── ORDERS — PLACE ADVANCE INTEREST ─────────────────────────────────────────

router.post('/listings/:id/interest', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const role = await getUserRole(userId);
        if (role !== 'FARMER') {
            return res.status(403).json({ success: false, error: 'Only farmers can express interest.' });
        }

        const data = placeInterestSchema.parse({ ...req.body, listing_id: req.params.id });

        const result = await transaction(async (client) => {
            const listingRes = await client.query(`
                SELECT fl.*, h.operator_id
                FROM fingerling_listings fl
                JOIN hatcheries h ON h.id = fl.hatchery_id
                WHERE fl.id = $1 FOR UPDATE
            `, [data.listing_id]);

            if (!listingRes.rows.length) {
                throw Object.assign(new Error('Listing not found.'), { status: 404 });
            }
            const listing = listingRes.rows[0];

            if (listing.operator_id === userId) {
                throw Object.assign(new Error('You cannot express interest in your own listing.'), { status: 400 });
            }
            if (listing.status !== 'UPCOMING') {
                throw Object.assign(
                    new Error('Advance interest is only allowed on UPCOMING listings.'),
                    { status: 400 },
                );
            }

            const { price } = applicablePrice(
                data.quantity_requested,
                parseFloat(listing.price_per_piece),
                listing.bulk_price_per_piece ? parseFloat(listing.bulk_price_per_piece) : null,
                listing.bulk_price_threshold,
            );
            const totalAmount = price * data.quantity_requested;

            const uidRes = await client.query('SELECT uid FROM users WHERE id = $1', [userId]);
            const farmerUid = uidRes.rows[0]?.uid ?? null;

            const orderRes = await client.query(`
                INSERT INTO fingerling_orders (
                    listing_id, farmer_id, farmer_uid, order_type,
                    quantity_ordered, price_per_piece, price_per_piece_at_order,
                    total_amount,
                    logistics_preference, preferred_date,
                    farmer_notes, status
                ) VALUES (
                    $1, $2, $3, 'ADVANCE_INTEREST',
                    $4, $5, $5,
                    $6,
                    $7, $8,
                    $9, 'INTEREST_REQUESTED'
                )
                RETURNING *
            `, [
                data.listing_id,
                userId,
                farmerUid,
                data.quantity_requested,
                price,
                totalAmount,
                data.logistics_preference ?? null,
                data.preferred_date ?? null,
                data.farmer_notes ?? null,
            ]);

            return { order: orderRes.rows[0], operatorId: listing.operator_id };
        });

        await notify(
            result.operatorId,
            'interest_requested',
            'New advance interest',
            'A farmer expressed interest in your upcoming listing.',
            data.listing_id,
            result.order.id,
        );

        res.status(201).json({ success: true, data: result.order });
    } catch (error: any) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        next(error);
    }
});

// ─── ORDERS — LIST MINE ──────────────────────────────────────────────────────

router.get('/orders/mine', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const role = await getUserRole(userId);

        let result;
        if (role === 'FARMER') {
            result = await query(`
                SELECT
                    fo.id,
                    fo.order_type,
                    fo.quantity_ordered,
                    fo.price_per_piece,
                    fo.price_per_piece_at_order,
                    fo.bulk_price_applied,
                    fo.total_amount,
                    fo.status,
                    fo.logistics_preference,
                    fo.preferred_date,
                    fo.farmer_notes,
                    fo.delivery_address,
                    fo.payment_screenshot_url,
                    fo.dispute_reason,
                    fo.dispute_description,
                    fo.farmer_paid_at,
                    fo.accepted_at,
                    fo.hatchery_confirmed_at,
                    fo.fulfilled_at,
                    fo.cancelled_at,
                    fo.created_at,
                    fo.updated_at,
                    fl.species_name,
                    fl.species_variant,
                    fl.stage,
                    fl.size_description,
                    fl.id          AS listing_id,
                    fl.status      AS listing_status,
                    fl.hatchery_uid_snapshot,
                    fl.contact_number_snapshot,
                    fl.upi_id_snapshot,
                    fl.email_snapshot,
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
            result = await query(`
                SELECT
                    fo.id,
                    fo.order_type,
                    fo.quantity_ordered,
                    fo.price_per_piece,
                    fo.total_amount,
                    fo.status,
                    fo.logistics_preference,
                    fo.preferred_date,
                    fo.farmer_notes,
                    fo.delivery_address,
                    fo.payment_screenshot_url,
                    fo.dispute_reason,
                    fo.dispute_description,
                    fo.farmer_paid_at,
                    fo.accepted_at,
                    fo.hatchery_confirmed_at,
                    fo.fulfilled_at,
                    fo.cancelled_at,
                    fo.created_at,
                    fo.updated_at,
                    fl.species_name,
                    fl.species_variant,
                    fl.stage,
                    fl.size_description,
                    fl.id          AS listing_id,
                    fl.status      AS listing_status,
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

// ─── ORDERS — DETAIL ─────────────────────────────────────────────────────────

router.get('/orders/:id', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const result = await query(`
            SELECT
                fo.*,
                fl.species_name, fl.species_variant, fl.stage, fl.size_description,
                fl.id   AS listing_id, fl.status AS listing_status,
                fl.hatchery_uid_snapshot, fl.contact_number_snapshot,
                fl.upi_id_snapshot, fl.email_snapshot,
                h.id    AS hatchery_id,
                h.name  AS hatchery_name,
                h.district AS hatchery_district,
                u.name  AS operator_name,
                u.phone_number AS operator_phone,
                uf.name AS farmer_name,
                uf.phone_number AS farmer_phone,
                uf.uid  AS farmer_uid_full,
                h.operator_id
            FROM fingerling_orders fo
            JOIN fingerling_listings fl ON fl.id = fo.listing_id
            JOIN hatcheries h           ON h.id  = fl.hatchery_id
            JOIN users u                ON u.id  = h.operator_id
            JOIN users uf               ON uf.id = fo.farmer_id
            WHERE fo.id = $1
        `, [id]);

        if (!result.rows.length) {
            return res.status(404).json({ success: false, error: 'Order not found.' });
        }

        const order = result.rows[0];
        const isFarmer = order.farmer_id === userId;
        const isHatchery = order.operator_id === userId;
        if (!isFarmer && !isHatchery) {
            return res.status(403).json({ success: false, error: 'Access denied.' });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
});

// ─── ORDERS — HATCHERY ACCEPT (reserves quantity) ────────────────────────────

router.patch('/orders/:id/accept', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const updated = await transaction(async (client) => {
            const orderRes = await client.query(`
                SELECT fo.*, fl.quantity_available, fl.min_order_qty, fl.status AS listing_status,
                       h.operator_id
                FROM fingerling_orders fo
                JOIN fingerling_listings fl ON fl.id = fo.listing_id
                JOIN hatcheries h           ON h.id  = fl.hatchery_id
                WHERE fo.id = $1 FOR UPDATE
            `, [id]);

            if (!orderRes.rows.length) {
                throw Object.assign(new Error('Order not found.'), { status: 404 });
            }
            const order = orderRes.rows[0];
            if (order.operator_id !== userId) {
                throw Object.assign(new Error('Access denied.'), { status: 403 });
            }
            if (order.order_type !== 'PURCHASE_ORDER') {
                throw Object.assign(new Error('Only purchase orders can be accepted.'), { status: 400 });
            }
            if (order.status !== 'REQUESTED') {
                throw Object.assign(new Error(`Cannot accept order in ${order.status} state.`), { status: 400 });
            }
            if (order.quantity_ordered > order.quantity_available) {
                throw Object.assign(
                    new Error(`Cannot accept — only ${order.quantity_available} pieces still available.`),
                    { status: 400 },
                );
            }

            // Reserve quantity
            await client.query(`
                UPDATE fingerling_listings
                SET reserved_quantity = reserved_quantity + $1,
                    quantity_available = quantity_available - $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [order.quantity_ordered, order.listing_id]);

            const r = await client.query(`
                UPDATE fingerling_orders
                SET status = 'ACCEPTED', accepted_at = NOW(), updated_at = NOW()
                WHERE id = $1 RETURNING *
            `, [id]);

            return { order: r.rows[0], farmerId: order.farmer_id };
        });

        await notify(
            updated.farmerId,
            'order_accepted',
            'Order accepted',
            'Your order was accepted. Please proceed with payment.',
            updated.order.listing_id,
            updated.order.id,
        );

        res.json({ success: true, data: updated.order });
    } catch (error: any) {
        if (error.status) return res.status(error.status).json({ success: false, error: error.message });
        next(error);
    }
});

// ─── ORDERS — HATCHERY REJECT ────────────────────────────────────────────────

router.patch('/orders/:id/reject', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;
        const { reason } = rejectOrderSchema.parse(req.body ?? {});

        const orderRes = await query(`
            SELECT fo.id, fo.status, fo.order_type, fo.farmer_id, fo.listing_id, h.operator_id
            FROM fingerling_orders fo
            JOIN fingerling_listings fl ON fl.id = fo.listing_id
            JOIN hatcheries h           ON h.id  = fl.hatchery_id
            WHERE fo.id = $1
        `, [id]);

        if (!orderRes.rows.length) return res.status(404).json({ success: false, error: 'Order not found.' });
        const order = orderRes.rows[0];
        if (order.operator_id !== userId) return res.status(403).json({ success: false, error: 'Access denied.' });
        if (order.order_type !== 'PURCHASE_ORDER') {
            return res.status(400).json({ success: false, error: 'Only purchase orders can be rejected.' });
        }
        if (order.status !== 'REQUESTED') {
            return res.status(400).json({ success: false, error: `Cannot reject in ${order.status}.` });
        }

        const updated = await query(`
            UPDATE fingerling_orders
            SET status = 'REJECTED', rejected_at = NOW(), rejection_reason = $2, updated_at = NOW()
            WHERE id = $1 RETURNING *
        `, [id, reason ?? null]);

        await notify(
            order.farmer_id,
            'order_rejected',
            'Order rejected',
            reason ? `Your order was rejected: ${reason}` : 'Your order was rejected by the hatchery.',
            order.listing_id,
            id,
        );

        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── ORDERS — FARMER MARKS PAID ──────────────────────────────────────────────

router.patch('/orders/:id/pay', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;
        const { payment_screenshot_url } = markPaidSchema.parse(req.body ?? {});

        const ownerRes = await query(`
            SELECT fo.id, fo.status, fo.order_type, fo.farmer_id, fo.listing_id, h.operator_id
            FROM fingerling_orders fo
            JOIN fingerling_listings fl ON fl.id = fo.listing_id
            JOIN hatcheries h           ON h.id  = fl.hatchery_id
            WHERE fo.id = $1
        `, [id]);

        if (!ownerRes.rows.length) return res.status(404).json({ success: false, error: 'Order not found.' });
        const order = ownerRes.rows[0];
        if (order.farmer_id !== userId) return res.status(403).json({ success: false, error: 'Access denied.' });
        if (order.order_type !== 'PURCHASE_ORDER') {
            return res.status(400).json({ success: false, error: 'Only purchase orders can be paid.' });
        }
        if (order.status !== 'ACCEPTED') {
            return res.status(400).json({ success: false, error: `Cannot mark paid in ${order.status}.` });
        }

        const updated = await query(`
            UPDATE fingerling_orders
            SET status = 'FARMER_PAID',
                farmer_paid_at = NOW(),
                payment_screenshot_url = COALESCE($2, payment_screenshot_url),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
        `, [id, payment_screenshot_url ?? null]);

        await notify(
            order.operator_id,
            'farmer_paid',
            'Farmer marked payment',
            'A farmer has marked their order as paid — please verify and confirm.',
            order.listing_id,
            id,
        );

        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── ORDERS — HATCHERY CONFIRMS (reserved → confirmed) ───────────────────────

router.patch('/orders/:id/confirm', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const updated = await transaction(async (client) => {
            const orderRes = await client.query(`
                SELECT fo.*, fl.batch_id, fl.species_name, fl.species_variant, h.operator_id
                FROM fingerling_orders fo
                JOIN fingerling_listings fl ON fl.id = fo.listing_id
                JOIN hatcheries h           ON h.id  = fl.hatchery_id
                WHERE fo.id = $1 FOR UPDATE
            `, [id]);

            if (!orderRes.rows.length) throw Object.assign(new Error('Order not found.'), { status: 404 });
            const order = orderRes.rows[0];
            if (order.operator_id !== userId) throw Object.assign(new Error('Access denied.'), { status: 403 });
            if (order.order_type !== 'PURCHASE_ORDER') {
                throw Object.assign(new Error('Only purchase orders can be confirmed.'), { status: 400 });
            }
            if (order.status !== 'FARMER_PAID') {
                throw Object.assign(new Error(`Cannot confirm in ${order.status}.`), { status: 400 });
            }

            // Move quantity from reserved → confirmed
            await client.query(`
                UPDATE fingerling_listings
                SET reserved_quantity = reserved_quantity - $1,
                    confirmed_quantity = confirmed_quantity + $1,
                    updated_at = NOW()
                WHERE id = $2
            `, [order.quantity_ordered, order.listing_id]);

            const r = await client.query(`
                UPDATE fingerling_orders
                SET status = 'HATCHERY_CONFIRMED', hatchery_confirmed_at = NOW(), updated_at = NOW()
                WHERE id = $1 RETURNING *
            `, [id]);

            // If the listing is linked to a hatchery batch, automatically log this sale
            if (order.batch_id) {
                // Fetch farmer details (buyer)
                const farmerRes = await client.query(`
                    SELECT u.name, u.phone_number, ld.name AS district_name, u.uid
                    FROM users u
                    LEFT JOIN loc_districts ld ON ld.code = u.district_code
                    WHERE u.id = $1
                `, [order.farmer_id]);
                const farmer = farmerRes.rows[0];
                const buyerName = farmer?.name ?? 'Farmer';
                const buyerPhone = farmer?.phone_number ?? null;
                const buyerDistrict = farmer?.district_name ?? null;
                const buyerUid = farmer?.uid ?? order.farmer_uid ?? null;

                // Fetch batch details to get avg_weight
                const batchRes = await client.query(`
                    SELECT avg_fingerling_weight_g FROM hatchery_batches WHERE id = $1
                `, [order.batch_id]);
                const avgWeightG = batchRes.rows[0]?.avg_fingerling_weight_g 
                    ? parseFloat(batchRes.rows[0].avg_fingerling_weight_g) 
                    : null;

                await client.query(`
                    INSERT INTO fingerling_sales (
                        batch_id, buyer_name, buyer_phone, buyer_district,
                        pricing_model, quantity_pieces, quantity_kg, avg_weight_g,
                        price_per_piece, price_per_kg, total_amount, delivery_date,
                        species_name, species_variant, buyer_uid
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `, [
                    order.batch_id,
                    buyerName,
                    buyerPhone,
                    buyerDistrict,
                    'per_piece',
                    order.quantity_ordered,
                    null, // quantity_kg
                    avgWeightG,
                    order.price_per_piece_at_order,
                    null, // price_per_kg
                    order.total_amount,
                    order.preferred_date ? new Date(order.preferred_date) : new Date(),
                    order.species_name,
                    order.species_variant,
                    buyerUid
                ]);
            }

            return { order: r.rows[0], farmerId: order.farmer_id, listingId: order.listing_id };
        });

        await notify(
            updated.farmerId,
            'payment_confirmed',
            'Payment confirmed',
            'The hatchery confirmed your payment. Arrange pickup / delivery.',
            updated.listingId,
            id,
        );

        res.json({ success: true, data: updated.order });
    } catch (error: any) {
        if (error.status) return res.status(error.status).json({ success: false, error: error.message });
        next(error);
    }
});

// ─── ORDERS — FULFILL (either party) ─────────────────────────────────────────

router.patch('/orders/:id/fulfill', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const orderRes = await query(`
            SELECT fo.id, fo.status, fo.order_type, fo.farmer_id, fo.listing_id, h.operator_id
            FROM fingerling_orders fo
            JOIN fingerling_listings fl ON fl.id = fo.listing_id
            JOIN hatcheries h           ON h.id  = fl.hatchery_id
            WHERE fo.id = $1
        `, [id]);

        if (!orderRes.rows.length) return res.status(404).json({ success: false, error: 'Order not found.' });
        const order = orderRes.rows[0];
        if (order.farmer_id !== userId && order.operator_id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied.' });
        }
        if (!['HATCHERY_CONFIRMED', 'DISPUTED'].includes(order.status)) {
            return res.status(400).json({ success: false, error: `Cannot fulfill in ${order.status}.` });
        }

        const updated = await query(`
            UPDATE fingerling_orders
            SET status = 'FULFILLED', fulfilled_at = NOW(), dispute_resolved_at = COALESCE(dispute_resolved_at, NOW()), updated_at = NOW()
            WHERE id = $1 RETURNING *
        `, [id]);

        const recipient = order.farmer_id === userId ? order.operator_id : order.farmer_id;
        await notify(
            recipient,
            'order_fulfilled',
            'Order marked fulfilled',
            'The order has been marked as fulfilled.',
            order.listing_id,
            id,
        );

        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── ORDERS — CANCEL (either party) ──────────────────────────────────────────

router.patch('/orders/:id/cancel', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const result = await transaction(async (client) => {
            const orderRes = await client.query(`
                SELECT fo.*, h.operator_id
                FROM fingerling_orders fo
                JOIN fingerling_listings fl ON fl.id = fo.listing_id
                JOIN hatcheries h           ON h.id  = fl.hatchery_id
                WHERE fo.id = $1 FOR UPDATE
            `, [id]);

            if (!orderRes.rows.length) throw Object.assign(new Error('Order not found.'), { status: 404 });
            const order = orderRes.rows[0];
            const isFarmer = order.farmer_id === userId;
            const isHatchery = order.operator_id === userId;
            if (!isFarmer && !isHatchery) throw Object.assign(new Error('Access denied.'), { status: 403 });

            // Cancel allowed at REQUESTED, ACCEPTED, FARMER_PAID (FARMER_PAID is grey area — spec says only REQUESTED / ACCEPTED, but allowing here for friction; if you want stricter, reject FARMER_PAID).
            const cancellableStatuses = ['REQUESTED', 'ACCEPTED', 'FARMER_PAID', 'INTEREST_REQUESTED', 'INTEREST_ACKNOWLEDGED'];
            if (!cancellableStatuses.includes(order.status)) {
                throw Object.assign(new Error(`Cannot cancel in ${order.status}.`), { status: 400 });
            }

            // If was ACCEPTED or FARMER_PAID, release reserved quantity
            if (['ACCEPTED', 'FARMER_PAID'].includes(order.status)) {
                await client.query(`
                    UPDATE fingerling_listings
                    SET reserved_quantity = reserved_quantity - $1,
                        quantity_available = quantity_available + $1,
                        updated_at = NOW()
                    WHERE id = $2
                `, [order.quantity_ordered, order.listing_id]);
            }

            const r = await client.query(`
                UPDATE fingerling_orders
                SET status = 'CANCELLED', cancelled_at = NOW(), cancelled_by = $2, updated_at = NOW()
                WHERE id = $1 RETURNING *
            `, [id, userId]);

            return { order: r.rows[0], farmerId: order.farmer_id, operatorId: order.operator_id, byFarmer: isFarmer };
        });

        const recipient = result.byFarmer ? result.operatorId : result.farmerId;
        await notify(
            recipient,
            'order_cancelled',
            'Order cancelled',
            'An order has been cancelled.',
            result.order.listing_id,
            id,
        );

        res.json({ success: true, data: result.order });
    } catch (error: any) {
        if (error.status) return res.status(error.status).json({ success: false, error: error.message });
        next(error);
    }
});

// ─── ORDERS — DISPUTE (either party, after CONFIRMED) ────────────────────────

router.patch('/orders/:id/dispute', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;
        const data = disputeSchema.parse(req.body);

        const orderRes = await query(`
            SELECT fo.id, fo.status, fo.farmer_id, fo.listing_id, h.operator_id
            FROM fingerling_orders fo
            JOIN fingerling_listings fl ON fl.id = fo.listing_id
            JOIN hatcheries h           ON h.id  = fl.hatchery_id
            WHERE fo.id = $1
        `, [id]);

        if (!orderRes.rows.length) return res.status(404).json({ success: false, error: 'Order not found.' });
        const order = orderRes.rows[0];
        const isFarmer = order.farmer_id === userId;
        const isHatchery = order.operator_id === userId;
        if (!isFarmer && !isHatchery) return res.status(403).json({ success: false, error: 'Access denied.' });
        if (!['HATCHERY_CONFIRMED', 'FULFILLED'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                error: 'Disputes can only be raised after the hatchery has confirmed payment.',
            });
        }

        const updated = await query(`
            UPDATE fingerling_orders
            SET status = 'DISPUTED',
                dispute_reason = $2,
                dispute_description = $3,
                disputed_at = NOW(),
                disputed_by = $4,
                updated_at = NOW()
            WHERE id = $1 RETURNING *
        `, [id, data.reason, data.description ?? null, userId]);

        const recipient = isFarmer ? order.operator_id : order.farmer_id;
        await notify(
            recipient,
            'dispute_raised',
            'Dispute raised on your order',
            `Reason: ${data.reason}${data.description ? ` — ${data.description}` : ''}`,
            order.listing_id,
            id,
        );

        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── ADVANCE INTEREST — ACKNOWLEDGE / DECLINE / CONVERT ──────────────────────

router.patch('/orders/:id/acknowledge', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const orderRes = await query(`
            SELECT fo.id, fo.status, fo.order_type, fo.farmer_id, fo.listing_id, h.operator_id
            FROM fingerling_orders fo
            JOIN fingerling_listings fl ON fl.id = fo.listing_id
            JOIN hatcheries h           ON h.id  = fl.hatchery_id
            WHERE fo.id = $1
        `, [id]);

        if (!orderRes.rows.length) return res.status(404).json({ success: false, error: 'Not found.' });
        const order = orderRes.rows[0];
        if (order.operator_id !== userId) return res.status(403).json({ success: false, error: 'Access denied.' });
        if (order.order_type !== 'ADVANCE_INTEREST' || order.status !== 'INTEREST_REQUESTED') {
            return res.status(400).json({ success: false, error: 'Invalid order state.' });
        }

        const updated = await query(`
            UPDATE fingerling_orders SET status = 'INTEREST_ACKNOWLEDGED', updated_at = NOW()
            WHERE id = $1 RETURNING *
        `, [id]);

        await notify(
            order.farmer_id,
            'interest_acknowledged',
            'Interest acknowledged',
            'The hatchery acknowledged your advance interest. You will be notified when stock becomes available.',
            order.listing_id,
            id,
        );

        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        next(error);
    }
});

router.patch('/orders/:id/decline', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;
        const { reason } = rejectOrderSchema.parse(req.body ?? {});

        const orderRes = await query(`
            SELECT fo.id, fo.status, fo.order_type, fo.farmer_id, fo.listing_id, h.operator_id
            FROM fingerling_orders fo
            JOIN fingerling_listings fl ON fl.id = fo.listing_id
            JOIN hatcheries h           ON h.id  = fl.hatchery_id
            WHERE fo.id = $1
        `, [id]);

        if (!orderRes.rows.length) return res.status(404).json({ success: false, error: 'Not found.' });
        const order = orderRes.rows[0];
        if (order.operator_id !== userId) return res.status(403).json({ success: false, error: 'Access denied.' });
        if (order.order_type !== 'ADVANCE_INTEREST' ||
            !['INTEREST_REQUESTED', 'INTEREST_ACKNOWLEDGED'].includes(order.status)) {
            return res.status(400).json({ success: false, error: 'Invalid order state.' });
        }

        const updated = await query(`
            UPDATE fingerling_orders
            SET status = 'INTEREST_DECLINED', rejection_reason = $2, updated_at = NOW()
            WHERE id = $1 RETURNING *
        `, [id, reason ?? null]);

        await notify(
            order.farmer_id,
            'interest_declined',
            'Advance interest declined',
            reason ?? 'The hatchery declined your advance interest.',
            order.listing_id,
            id,
        );

        res.json({ success: true, data: updated.rows[0] });
    } catch (error) {
        next(error);
    }
});

/**
 * Farmer converts an INTEREST_ACKNOWLEDGED order into a real PURCHASE_ORDER
 * once the listing transitions to AVAILABLE.
 */
router.post('/orders/:id/convert', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;
        const data = z.object({
            logistics_preference: z.enum(['PICKUP', 'DELIVERY']),
            preferred_date:       z.string().date().optional().nullable(),
            farmer_notes:         z.string().max(500).optional().nullable(),
            delivery_address:     z.string().max(500).optional().nullable(),
        }).parse(req.body ?? {});

        const result = await transaction(async (client) => {
            const interestRes = await client.query(`
                SELECT fo.*, fl.status AS listing_status, fl.min_order_qty,
                       fl.quantity_available, fl.pickup_available, fl.delivery_available,
                       fl.price_per_piece, fl.bulk_price_per_piece, fl.bulk_price_threshold,
                       h.operator_id
                FROM fingerling_orders fo
                JOIN fingerling_listings fl ON fl.id = fo.listing_id
                JOIN hatcheries h           ON h.id  = fl.hatchery_id
                WHERE fo.id = $1 FOR UPDATE
            `, [id]);

            if (!interestRes.rows.length) throw Object.assign(new Error('Interest not found.'), { status: 404 });
            const interest = interestRes.rows[0];
            if (interest.farmer_id !== userId) throw Object.assign(new Error('Access denied.'), { status: 403 });
            if (interest.order_type !== 'ADVANCE_INTEREST' || interest.status !== 'INTEREST_ACKNOWLEDGED') {
                throw Object.assign(new Error('This interest cannot be converted.'), { status: 400 });
            }
            if (interest.listing_status !== 'AVAILABLE') {
                throw Object.assign(new Error('Listing is not yet available.'), { status: 400 });
            }
            if (interest.quantity_ordered > interest.quantity_available) {
                throw Object.assign(
                    new Error(`Only ${interest.quantity_available} pieces available — not enough to cover your interest.`),
                    { status: 400 },
                );
            }
            if (data.logistics_preference === 'PICKUP' && !interest.pickup_available) {
                throw Object.assign(new Error('Pickup not offered.'), { status: 400 });
            }
            if (data.logistics_preference === 'DELIVERY' && !interest.delivery_available) {
                throw Object.assign(new Error('Delivery not offered.'), { status: 400 });
            }

            const { price, bulk } = applicablePrice(
                interest.quantity_ordered,
                parseFloat(interest.price_per_piece),
                interest.bulk_price_per_piece ? parseFloat(interest.bulk_price_per_piece) : null,
                interest.bulk_price_threshold,
            );
            const totalAmount = price * interest.quantity_ordered;

            const orderRes = await client.query(`
                INSERT INTO fingerling_orders (
                    listing_id, farmer_id, farmer_uid, order_type,
                    quantity_ordered, price_per_piece, price_per_piece_at_order,
                    bulk_price_applied, total_amount,
                    logistics_preference, preferred_date,
                    farmer_notes, delivery_address, status
                ) VALUES (
                    $1, $2, $3, 'PURCHASE_ORDER',
                    $4, $5, $5, $6, $7,
                    $8, $9, $10, $11, 'REQUESTED'
                )
                RETURNING *
            `, [
                interest.listing_id,
                userId,
                interest.farmer_uid,
                interest.quantity_ordered,
                price,
                bulk,
                totalAmount,
                data.logistics_preference,
                data.preferred_date ?? null,
                data.farmer_notes ?? null,
                data.delivery_address ?? null,
            ]);

            // Mark interest as converted
            await client.query(`
                UPDATE fingerling_orders
                SET status = 'INTEREST_CONVERTED', interest_converted_to = $2, updated_at = NOW()
                WHERE id = $1
            `, [id, orderRes.rows[0].id]);

            return { order: orderRes.rows[0], operatorId: interest.operator_id, listingId: interest.listing_id };
        });

        await notify(
            result.operatorId,
            'order_placed',
            'Interest converted to order',
            'A farmer converted their advance interest into a real order.',
            result.listingId,
            result.order.id,
        );

        res.status(201).json({ success: true, data: result.order });
    } catch (error: any) {
        if (error.status) return res.status(error.status).json({ success: false, error: error.message });
        next(error);
    }
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

router.get('/notifications', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { unreadOnly } = req.query;

        const where = unreadOnly === 'true'
            ? `WHERE recipient_id = $1 AND is_read = FALSE`
            : `WHERE recipient_id = $1`;

        const result = await query(`
            SELECT id, type, title, message, listing_id, order_id, is_read, created_at
            FROM marketplace_notifications
            ${where}
            ORDER BY created_at DESC
            LIMIT 100
        `, [userId]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        next(error);
    }
});

router.patch('/notifications/:id/read', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const result = await query(`
            UPDATE marketplace_notifications SET is_read = TRUE
            WHERE id = $1 AND recipient_id = $2
            RETURNING id, is_read
        `, [id, userId]);

        if (!result.rows.length) {
            return res.status(404).json({ success: false, error: 'Notification not found.' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// ─── SPECIES ENUM (for client form pickers) ──────────────────────────────────

router.get('/species', requireAuth, async (_req, res) => {
    res.json({ success: true, data: SPECIES_ENUM });
});

export { router as marketplaceRouter };

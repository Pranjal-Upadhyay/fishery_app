-- ============================================================================
-- Migration 039: Marketplace v2 — Government-Grade Listing & Order Model
--
-- Expands the marketplace feature to match the full spec:
--   • Hatchery profile gains government UID + contact + UPI + email
--   • Listings gain timing (expected_ready_date / last_available_date),
--     logistics flags, bulk pricing, and richer status lifecycle
--   • Orders gain order_type, status flow with REQUESTED→ACCEPTED→PAID→
--     CONFIRMED→FULFILLED, advance interest, and dispute handling
--   • Inventory model switches to (reserved + confirmed) buckets
--   • Notifications table for marketplace events
--
-- Backfill is included for existing listings/orders.
-- ============================================================================

-- ─── 1. HATCHERIES — gov UID + contact + payment ─────────────────────────────

ALTER TABLE hatcheries
    ADD COLUMN IF NOT EXISTS hatchery_uid   VARCHAR(64),   -- government registration UID
    ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS upi_id         VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hatcheries_hatchery_uid
    ON hatcheries(hatchery_uid)
    WHERE hatchery_uid IS NOT NULL;

-- Backfill: copy operator's phone to contact_number if missing
UPDATE hatcheries h
SET contact_number = u.phone_number
FROM users u
WHERE u.id = h.operator_id
  AND h.contact_number IS NULL
  AND u.phone_number IS NOT NULL;

-- ─── 2. FINGERLING_LISTINGS — new fields ─────────────────────────────────────

-- Snapshot of hatchery contact (frozen on listing per spec design)
ALTER TABLE fingerling_listings
    ADD COLUMN IF NOT EXISTS hatchery_uid_snapshot   VARCHAR(64),
    ADD COLUMN IF NOT EXISTS contact_number_snapshot VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email_snapshot          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS upi_id_snapshot         VARCHAR(120);

-- Location snapshot (so listing card doesn't have to re-join hatchery for browse)
ALTER TABLE fingerling_listings
    ADD COLUMN IF NOT EXISTS district_snapshot  TEXT,
    ADD COLUMN IF NOT EXISTS block_snapshot     TEXT,
    ADD COLUMN IF NOT EXISTS panchayat_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS geo_lat            NUMERIC(9,6),
    ADD COLUMN IF NOT EXISTS geo_lng            NUMERIC(9,6);

-- Product detail
ALTER TABLE fingerling_listings
    ADD COLUMN IF NOT EXISTS size_description       VARCHAR(200);

-- Bulk pricing
ALTER TABLE fingerling_listings
    ADD COLUMN IF NOT EXISTS bulk_price_per_piece   NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS bulk_price_threshold   INTEGER;

-- Timing — core to UPCOMING / EXPIRED transitions
ALTER TABLE fingerling_listings
    ADD COLUMN IF NOT EXISTS expected_ready_date  DATE,
    ADD COLUMN IF NOT EXISTS last_available_date  DATE;

-- Logistics
ALTER TABLE fingerling_listings
    ADD COLUMN IF NOT EXISTS pickup_available    BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS delivery_available  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS logistics_notes     TEXT;

-- Inventory v2 — reserved + confirmed split
ALTER TABLE fingerling_listings
    ADD COLUMN IF NOT EXISTS reserved_quantity   INTEGER NOT NULL DEFAULT 0
        CHECK (reserved_quantity >= 0),
    ADD COLUMN IF NOT EXISTS confirmed_quantity  INTEGER NOT NULL DEFAULT 0
        CHECK (confirmed_quantity >= 0);

-- Expand status enum to v2 values. Old values are kept temporarily so the old
-- code path continues to work until the backend cuts over.
ALTER TABLE fingerling_listings DROP CONSTRAINT IF EXISTS fingerling_listings_status_check;
ALTER TABLE fingerling_listings
    ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE fingerling_listings
    ADD CONSTRAINT fingerling_listings_status_check
    CHECK (status IN (
        -- v2
        'DRAFT', 'UPCOMING', 'AVAILABLE', 'CLOSED', 'EXPIRED',
        -- legacy (will be migrated below; remove in 040)
        'ACTIVE', 'SOLD_OUT', 'CANCELLED'
    ));

-- Backfill: legacy ACTIVE -> AVAILABLE; SOLD_OUT -> CLOSED; CANCELLED -> CLOSED
UPDATE fingerling_listings SET status = 'AVAILABLE' WHERE status = 'ACTIVE';
UPDATE fingerling_listings SET status = 'CLOSED'    WHERE status IN ('SOLD_OUT', 'CANCELLED');

-- Backfill snapshots from hatchery
UPDATE fingerling_listings fl
SET hatchery_uid_snapshot   = h.hatchery_uid,
    contact_number_snapshot = COALESCE(h.contact_number, u.phone_number),
    email_snapshot          = h.email,
    upi_id_snapshot         = h.upi_id,
    district_snapshot       = h.district,
    block_snapshot          = h.block,
    panchayat_snapshot      = h.panchayat
FROM hatcheries h
JOIN users u ON u.id = h.operator_id
WHERE fl.hatchery_id = h.id
  AND fl.contact_number_snapshot IS NULL;

-- Backfill timing for existing rows: ready since creation, valid for 60 days
UPDATE fingerling_listings
SET expected_ready_date = COALESCE(expected_ready_date, created_at::DATE),
    last_available_date = COALESCE(last_available_date, (created_at + INTERVAL '60 days')::DATE);

-- Backfill inventory v2 from existing order state.
-- Old model deducted quantity_available at order creation; new model holds
-- in reserved_quantity until HATCHERY_CONFIRMED, then moves to confirmed.
UPDATE fingerling_listings fl
SET confirmed_quantity = COALESCE((
        SELECT SUM(quantity_ordered)
        FROM fingerling_orders fo
        WHERE fo.listing_id = fl.id
          AND fo.status = 'HATCHERY_CONFIRMED'
    ), 0),
    reserved_quantity = COALESCE((
        SELECT SUM(quantity_ordered)
        FROM fingerling_orders fo
        WHERE fo.listing_id = fl.id
          AND fo.status IN ('PENDING', 'FARMER_PAID')
    ), 0);

-- Re-derive quantity_available from the v2 model for consistency
UPDATE fingerling_listings
SET quantity_available = GREATEST(total_quantity - reserved_quantity - confirmed_quantity, 0);

-- ─── 3. FINGERLING_ORDERS — order type, statuses, snapshots, dispute ─────────

ALTER TABLE fingerling_orders
    ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) NOT NULL DEFAULT 'PURCHASE_ORDER'
        CHECK (order_type IN ('PURCHASE_ORDER', 'ADVANCE_INTEREST'));

-- Snapshot pricing so listing price edits don't retroactively change orders
ALTER TABLE fingerling_orders
    ADD COLUMN IF NOT EXISTS price_per_piece_at_order NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS bulk_price_applied       BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE fingerling_orders
SET price_per_piece_at_order = price_per_piece
WHERE price_per_piece_at_order IS NULL;

-- Logistics + preference
ALTER TABLE fingerling_orders
    ADD COLUMN IF NOT EXISTS preferred_date        DATE,
    ADD COLUMN IF NOT EXISTS logistics_preference  VARCHAR(20)
        CHECK (logistics_preference IN ('PICKUP', 'DELIVERY'));

-- Payment proof
ALTER TABLE fingerling_orders
    ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;

-- New status timestamps
ALTER TABLE fingerling_orders
    ADD COLUMN IF NOT EXISTS accepted_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS fulfilled_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by     UUID REFERENCES users(id) ON DELETE SET NULL;

-- Dispute
ALTER TABLE fingerling_orders
    ADD COLUMN IF NOT EXISTS dispute_reason       VARCHAR(60)
        CHECK (dispute_reason IN (
            'QUANTITY_MISMATCH', 'HIGH_MORTALITY', 'NOT_AS_DESCRIBED',
            'PAYMENT_NOT_RECEIVED', 'OTHER'
        ) OR dispute_reason IS NULL),
    ADD COLUMN IF NOT EXISTS dispute_description  TEXT,
    ADD COLUMN IF NOT EXISTS disputed_at          TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disputed_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS dispute_resolved_at  TIMESTAMPTZ;

-- Advance interest helpers
ALTER TABLE fingerling_orders
    ADD COLUMN IF NOT EXISTS interest_converted_to UUID REFERENCES fingerling_orders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS interest_lapsed_at    TIMESTAMPTZ;

-- Expand status enum
ALTER TABLE fingerling_orders DROP CONSTRAINT IF EXISTS fingerling_orders_status_check;
ALTER TABLE fingerling_orders
    ALTER COLUMN status SET DEFAULT 'REQUESTED';
ALTER TABLE fingerling_orders
    ADD CONSTRAINT fingerling_orders_status_check
    CHECK (status IN (
        -- v2 purchase order statuses
        'REQUESTED', 'ACCEPTED', 'REJECTED', 'FARMER_PAID',
        'HATCHERY_CONFIRMED', 'FULFILLED', 'CANCELLED', 'DISPUTED',
        -- v2 advance interest statuses
        'INTEREST_REQUESTED', 'INTEREST_ACKNOWLEDGED',
        'INTEREST_DECLINED', 'INTEREST_CONVERTED',
        -- legacy (migrated below)
        'PENDING'
    ));

-- Backfill: PENDING -> REQUESTED
UPDATE fingerling_orders SET status = 'REQUESTED' WHERE status = 'PENDING';

-- Default logistics_preference based on listing flags for existing rows
UPDATE fingerling_orders fo
SET logistics_preference = CASE
    WHEN fl.delivery_available AND NOT fl.pickup_available THEN 'DELIVERY'
    ELSE 'PICKUP'
END
FROM fingerling_listings fl
WHERE fo.listing_id = fl.id
  AND fo.logistics_preference IS NULL;

-- ─── 4. MARKETPLACE_NOTIFICATIONS ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(60) NOT NULL,
    -- Examples: 'order_placed', 'order_accepted', 'order_rejected',
    --          'farmer_paid', 'payment_confirmed', 'order_fulfilled',
    --          'order_cancelled', 'dispute_raised', 'dispute_resolved',
    --          'listing_due_today', 'interest_converted_prompt',
    --          'interest_acknowledged', 'interest_declined'
    title           TEXT NOT NULL,
    message         TEXT NOT NULL,
    listing_id      UUID REFERENCES fingerling_listings(id) ON DELETE CASCADE,
    order_id        UUID REFERENCES fingerling_orders(id) ON DELETE CASCADE,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_recipient
    ON marketplace_notifications(recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_notifications_order
    ON marketplace_notifications(order_id);

-- ─── 5. INDEXES on new lookup columns ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fl_expected_ready_date
    ON fingerling_listings(expected_ready_date);

CREATE INDEX IF NOT EXISTS idx_fl_last_available_date
    ON fingerling_listings(last_available_date);

CREATE INDEX IF NOT EXISTS idx_fo_order_type
    ON fingerling_orders(order_type);

CREATE INDEX IF NOT EXISTS idx_fo_dispute_status
    ON fingerling_orders(status)
    WHERE status = 'DISPUTED';

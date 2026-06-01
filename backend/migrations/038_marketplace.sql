-- 038_marketplace.sql
-- Fingerling marketplace: hatcheries post listings, farmers place orders,
-- both sides confirm payment (no in-app payment processing).

-- ─── Listings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fingerling_listings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hatchery_id         UUID NOT NULL REFERENCES hatcheries(id) ON DELETE CASCADE,
    batch_id            UUID REFERENCES hatchery_batches(id) ON DELETE SET NULL,

    -- Product info
    stage               VARCHAR(20) NOT NULL CHECK (stage IN ('fry', 'fingerling')),
    species_name        VARCHAR(100) NOT NULL,
    species_variant     VARCHAR(100),
    description         TEXT,

    -- Quantities
    total_quantity      INTEGER NOT NULL CHECK (total_quantity > 0),
    quantity_available  INTEGER NOT NULL CHECK (quantity_available >= 0),
    min_order_qty       INTEGER NOT NULL DEFAULT 100 CHECK (min_order_qty > 0),

    -- Pricing
    price_per_piece     NUMERIC(10,2) NOT NULL CHECK (price_per_piece >= 0),

    -- Lifecycle
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'SOLD_OUT', 'CANCELLED')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Orders ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fingerling_orders (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id               UUID NOT NULL REFERENCES fingerling_listings(id) ON DELETE CASCADE,
    farmer_id                UUID NOT NULL REFERENCES users(id),
    farmer_uid               VARCHAR(32),

    -- What was ordered
    quantity_ordered         INTEGER NOT NULL CHECK (quantity_ordered > 0),
    price_per_piece          NUMERIC(10,2) NOT NULL,
    total_amount             NUMERIC(12,2) NOT NULL,

    -- Two-way payment confirmation
    status                   VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                             CHECK (status IN ('PENDING', 'FARMER_PAID', 'HATCHERY_CONFIRMED', 'CANCELLED')),
    farmer_notes             TEXT,
    delivery_address         TEXT,
    farmer_paid_at           TIMESTAMPTZ,
    hatchery_confirmed_at    TIMESTAMPTZ,

    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fl_hatchery_id   ON fingerling_listings(hatchery_id);
CREATE INDEX IF NOT EXISTS idx_fl_status        ON fingerling_listings(status);
CREATE INDEX IF NOT EXISTS idx_fl_species       ON fingerling_listings(species_name);
CREATE INDEX IF NOT EXISTS idx_fo_listing_id    ON fingerling_orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_fo_farmer_id     ON fingerling_orders(farmer_id);
CREATE INDEX IF NOT EXISTS idx_fo_status        ON fingerling_orders(status);

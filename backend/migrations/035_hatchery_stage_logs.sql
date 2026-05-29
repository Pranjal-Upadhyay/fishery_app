-- ============================================================================
-- Migration 035: Hatchery Stage Logs
--
-- Adds stage-level event logging for hatchery batches, static benchmark data
-- per stage, fingerling sales records, and grow-out start logs that link a
-- fingerling sale back to a specific farmer's pond.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hatchery_stage_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id            UUID NOT NULL REFERENCES hatchery_batches(id) ON DELETE CASCADE,
    stage               TEXT NOT NULL,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at            TIMESTAMPTZ,
    count_at_entry      BIGINT,
    count_at_exit       BIGINT,
    survival_rate_pct   NUMERIC GENERATED ALWAYS AS (
                            CASE WHEN count_at_entry > 0 AND count_at_exit IS NOT NULL
                                 THEN ROUND((count_at_exit::NUMERIC / count_at_entry) * 100, 1)
                            END
                        ) STORED,
    water_temp          NUMERIC,
    ph                  NUMERIC,
    do_mgl              NUMERIC,
    ammonia_ppm         NUMERIC,
    feed_given_kg       NUMERIC,
    observations        TEXT,
    logged_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hatchery_stage_benchmarks (
    stage           TEXT PRIMARY KEY,
    min_days        INT,
    max_days        INT,
    typical_days    INT,
    description     TEXT
);

INSERT INTO hatchery_stage_benchmarks VALUES
    ('broodstock',      90, 180, 120, 'Broodstock conditioning before spawning'),
    ('spawning',         0,   1,   0, 'Hormone injection to egg release (12-18 hrs)'),
    ('hatching',         0,   1,   1, 'Fertilization to hatch (12-20 hrs)'),
    ('nursery',         21,  30,  25, 'Spawn to fry in nursery pond'),
    ('rearing',         60,  90,  75, 'Fry to fingerling in rearing pond'),
    ('fingerling_ready', 0,   0,   0, 'Ready for sale')
ON CONFLICT (stage) DO UPDATE SET
    description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS fingerling_sales (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id            UUID NOT NULL REFERENCES hatchery_batches(id) ON DELETE RESTRICT,
    transaction_ref     TEXT UNIQUE NOT NULL DEFAULT 'TXN-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 4)),
    buyer_user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    buyer_name          TEXT,
    buyer_phone         TEXT,
    buyer_district      TEXT,
    sale_date           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pricing_model       TEXT NOT NULL CHECK (pricing_model IN ('per_piece','per_kg')),
    quantity_pieces     INT,
    quantity_kg         NUMERIC,
    avg_weight_g        NUMERIC,
    price_per_piece     NUMERIC,
    price_per_kg        NUMERIC,
    total_amount        NUMERIC,
    delivery_date       TIMESTAMPTZ,
    species_name        TEXT,
    species_variant     TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grow_out_start_logs (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id                 UUID REFERENCES fingerling_sales(id) ON DELETE SET NULL,
    farmer_user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    pond_id                 TEXT,            -- references ponds.id (UUID as text for compat)
    received_date           DATE,
    stocked_date            DATE,
    fingerling_count        INT,
    fingerling_avg_weight_g NUMERIC,
    expected_harvest_date   DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hatchery_stage_logs_batch ON hatchery_stage_logs(batch_id, stage);
CREATE INDEX IF NOT EXISTS idx_fingerling_sales_batch ON fingerling_sales(batch_id);
CREATE INDEX IF NOT EXISTS idx_fingerling_sales_ref ON fingerling_sales(transaction_ref);

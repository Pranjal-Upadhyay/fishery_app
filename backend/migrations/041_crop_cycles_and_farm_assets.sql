-- ============================================================================
-- Migration 041: Crop Cycles & Farm Assets (gov survey Buckets 3)
--
-- crop_cycles  — one row per season per pond. Records production figures,
--                input cost breakdown, and revenue. Survey Section B's
--                recurring fields plus the 8 cost items from Section B-16.
--
-- farm_assets  — per-farmer assets (aerators, pumps, boats, nets, etc.) with
--                optional pond link. Auto-computed annual depreciation from
--                cost, salvage, and economic life. Survey Section E.
-- ============================================================================

CREATE TABLE IF NOT EXISTS crop_cycles (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pond_id                  UUID NOT NULL REFERENCES ponds(id) ON DELETE CASCADE,
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    cycle_name               VARCHAR(120) NOT NULL,
    species_name             VARCHAR(120),
    start_date               DATE NOT NULL,
    end_date                 DATE,
    status                   VARCHAR(20) NOT NULL DEFAULT 'ONGOING'
                                 CHECK (status IN ('ONGOING','HARVESTED','CANCELLED')),

    -- Production (kg)
    present_production_kg    NUMERIC(12,2),  -- running total while ongoing
    total_production_kg      NUMERIC(12,2),  -- final at harvest

    -- Input cost breakdown (₹)
    feed_formulated_cost     NUMERIC(12,2),
    feed_homemade_cost       NUMERIC(12,2),
    probiotic_cost           NUMERIC(12,2),
    medicine_cost            NUMERIC(12,2),
    electricity_cost         NUMERIC(12,2),
    labour_hired_cost        NUMERIC(12,2),
    labour_family_cost       NUMERIC(12,2),
    other_cost               NUMERIC(12,2),

    -- Revenue (₹)
    revenue_inr              NUMERIC(12,2),

    remarks                  TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crop_cycles_pond  ON crop_cycles(pond_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_user  ON crop_cycles(user_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_status ON crop_cycles(status);

-- ─── Farm Assets ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS farm_assets (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pond_id                  UUID REFERENCES ponds(id) ON DELETE SET NULL,

    asset_type               VARCHAR(40) NOT NULL
                                 CHECK (asset_type IN (
                                     'AERATOR','MOTOR_PUMP','BOAT','FISH_NET','BORE_WELL',
                                     'BIOFLOC_TANK','RAS','BIOFLOC_POND','CIVIL_WORK_POND',
                                     'EMBANKMENT','OTHER'
                                 )),
    -- For OTHER (or just a friendlier display name) — required free-text label
    asset_name               VARCHAR(160) NOT NULL,
    purchase_date            DATE NOT NULL,
    cost_inr                 NUMERIC(12,2) NOT NULL CHECK (cost_inr >= 0),
    economic_life_years      NUMERIC(6,2)  NOT NULL CHECK (economic_life_years > 0),
    salvage_value_inr        NUMERIC(12,2) NOT NULL DEFAULT 0
                                 CHECK (salvage_value_inr >= 0),

    -- Generated annual depreciation = (cost - salvage) / life
    annual_depreciation_inr  NUMERIC(12,2) GENERATED ALWAYS AS (
        ROUND((cost_inr - salvage_value_inr) / NULLIF(economic_life_years, 0), 2)
    ) STORED,

    remarks                  TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farm_assets_user ON farm_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_assets_pond ON farm_assets(pond_id);
CREATE INDEX IF NOT EXISTS idx_farm_assets_type ON farm_assets(asset_type);

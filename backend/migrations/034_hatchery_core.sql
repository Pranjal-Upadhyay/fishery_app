-- ============================================================================
-- Migration 034: Hatchery Core
--
-- Creates the hatcheries and hatchery_batches tables for the Hatchery
-- Lifecycle Tracking feature. Each hatchery has an operator and location
-- metadata; each batch tracks a single species run from broodstock through
-- to fingerling-ready or sold state.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS hatcheries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    operator_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    district        TEXT,
    block           TEXT,
    panchayat       TEXT,
    capacity_kg     NUMERIC,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hatchery_batches (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hatchery_id                 UUID REFERENCES hatcheries(id) ON DELETE CASCADE,
    species_id                  TEXT,   -- optional reference to knowledge_nodes species id
    species_name                TEXT NOT NULL,
    species_variant             TEXT,          -- 'Jayanti Rohu', 'Amrita Katla', 'Standard'
    broodstock_male_count       INT,
    broodstock_female_count     INT,
    broodstock_total_kg         NUMERIC,
    spawning_date               TIMESTAMPTZ,
    current_stage               TEXT NOT NULL DEFAULT 'broodstock' CHECK (current_stage IN (
                                    'broodstock','spawning','hatching','nursery','rearing','fingerling_ready','sold'
                                )),
    estimated_spawn_count       BIGINT,        -- in individual count
    estimated_fry_count         BIGINT,
    estimated_fingerling_count  BIGINT,
    avg_fingerling_weight_g     NUMERIC,
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hatchery_batches_hatchery ON hatchery_batches(hatchery_id);
CREATE INDEX IF NOT EXISTS idx_hatchery_batches_stage ON hatchery_batches(current_stage);

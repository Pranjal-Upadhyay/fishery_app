-- ============================================================================
-- Migration 036: Ponds Grow-Out Fields
--
-- Extends the existing ponds table with fields needed to track grow-out
-- lifecycle data: fingerling stocking info (sourced from a hatchery sale or
-- a dealer), expected harvest date, and actual harvest results.
-- ============================================================================

ALTER TABLE ponds
    ADD COLUMN IF NOT EXISTS fingerling_count         INT,
    ADD COLUMN IF NOT EXISTS fingerling_avg_weight_g  NUMERIC,
    ADD COLUMN IF NOT EXISTS fingerling_source        TEXT,   -- 'hatchery' | 'dealer' | 'own'
    ADD COLUMN IF NOT EXISTS fingerling_transaction_ref TEXT,
    ADD COLUMN IF NOT EXISTS species_variant          TEXT,
    ADD COLUMN IF NOT EXISTS expected_harvest_date    DATE,
    ADD COLUMN IF NOT EXISTS harvest_weight_kg        NUMERIC,
    ADD COLUMN IF NOT EXISTS actual_harvest_date      DATE;

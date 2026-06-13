-- ============================================================================
-- Migration 049: Hatchery Survey Fields
--
-- Adds fields to the hatcheries table to align with the BAIP survey:
--   - social_category (General / OBC / EBC / SC / ST)
--   - age (numeric)
--   - annual_income (numeric)
--   - family_size (household members)
--   - flood_impact_3yrs (boolean)
--   - disease_occurrence (None / Minor / Major)
--   - pond_insured (boolean)
-- ============================================================================

ALTER TABLE hatcheries
    ADD COLUMN IF NOT EXISTS social_category TEXT,
    ADD COLUMN IF NOT EXISTS age INTEGER,
    ADD COLUMN IF NOT EXISTS annual_income NUMERIC,
    ADD COLUMN IF NOT EXISTS family_size INTEGER,
    ADD COLUMN IF NOT EXISTS flood_impact_3yrs BOOLEAN,
    ADD COLUMN IF NOT EXISTS disease_occurrence VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pond_insured BOOLEAN;

-- Optional check constraint for disease_occurrence
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hatcheries_disease_occurrence_check') THEN
        ALTER TABLE hatcheries ADD CONSTRAINT hatcheries_disease_occurrence_check
            CHECK (disease_occurrence IS NULL OR disease_occurrence IN ('NONE','MINOR','MAJOR'));
    END IF;
END $$;

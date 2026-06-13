-- ============================================================================
-- Migration 050: Hatchery Additional Survey Fields
--
-- Adds fields to the hatcheries table to align with all columns of the BAIP survey:
--   - gender (TEXT)
--   - female_headed (BOOLEAN)
--   - education_level (TEXT)
--   - income_control (TEXT)
-- ============================================================================

ALTER TABLE hatcheries
    ADD COLUMN IF NOT EXISTS gender TEXT,
    ADD COLUMN IF NOT EXISTS female_headed BOOLEAN,
    ADD COLUMN IF NOT EXISTS education_level TEXT,
    ADD COLUMN IF NOT EXISTS income_control TEXT;

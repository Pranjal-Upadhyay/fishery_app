-- ============================================================================
-- Migration 051: Add Ponds Sync Fields
--
-- Adds missing columns (district_name, block_name, panchayat_name, image_uri)
-- to ponds table to ensure sync alignment with mobile client.
-- ============================================================================

ALTER TABLE ponds
    ADD COLUMN IF NOT EXISTS district_name   VARCHAR(120),
    ADD COLUMN IF NOT EXISTS block_name      VARCHAR(120),
    ADD COLUMN IF NOT EXISTS panchayat_name  VARCHAR(120),
    ADD COLUMN IF NOT EXISTS image_uri       TEXT;

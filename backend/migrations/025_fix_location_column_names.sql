-- ============================================================================
-- Migration 025: Fix location table column names for schema consistency
-- ============================================================================
-- 020_create_location_hierarchy.sql created tables with:
--   loc_districts  → PK=district_code, name col=district_name
--   loc_blocks     → PK=block_code,    name col=block_name
--   loc_panchayats → PK=panchayat_code,name col=panchayat_name
--
-- 024_seed_bihar_location_data.sql expects:
--   all three tables → PK=code, name col=name
--
-- 020_bihar_location_hierarchy.sql already ran and was marked applied,
-- so it cannot re-run. This migration finishes the job by doing the renames
-- that were missing. All operations are fully idempotent.
-- ============================================================================

DO $$ BEGIN

  -- ── loc_districts ──────────────────────────────────────────────────────────

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_districts' AND column_name='district_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_districts' AND column_name='code'
  ) THEN
    ALTER TABLE loc_districts RENAME COLUMN district_code TO code;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_districts' AND column_name='district_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_districts' AND column_name='name'
  ) THEN
    ALTER TABLE loc_districts RENAME COLUMN district_name TO name;
  END IF;

  -- ── loc_blocks ─────────────────────────────────────────────────────────────

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_blocks' AND column_name='block_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_blocks' AND column_name='code'
  ) THEN
    ALTER TABLE loc_blocks RENAME COLUMN block_code TO code;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_blocks' AND column_name='block_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_blocks' AND column_name='name'
  ) THEN
    ALTER TABLE loc_blocks RENAME COLUMN block_name TO name;
  END IF;

  -- ── loc_panchayats ─────────────────────────────────────────────────────────

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_panchayats' AND column_name='panchayat_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_panchayats' AND column_name='code'
  ) THEN
    ALTER TABLE loc_panchayats RENAME COLUMN panchayat_code TO code;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_panchayats' AND column_name='panchayat_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_panchayats' AND column_name='name'
  ) THEN
    ALTER TABLE loc_panchayats RENAME COLUMN panchayat_name TO name;
  END IF;

END $$;

-- Widen VARCHAR lengths so 024 inserts fit without truncation
ALTER TABLE loc_districts  ALTER COLUMN code TYPE VARCHAR(24);
ALTER TABLE loc_blocks     ALTER COLUMN code TYPE VARCHAR(60);
ALTER TABLE loc_panchayats ALTER COLUMN code TYPE VARCHAR(100);

-- Add any columns still missing (safe no-ops if already present)
ALTER TABLE loc_districts  ADD COLUMN IF NOT EXISTS name_raw   VARCHAR(120) DEFAULT '';
ALTER TABLE loc_districts  ADD COLUMN IF NOT EXISTS lgd_code   VARCHAR(20);
ALTER TABLE loc_districts  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE loc_blocks     ADD COLUMN IF NOT EXISTS name_raw   VARCHAR(120) DEFAULT '';
ALTER TABLE loc_blocks     ADD COLUMN IF NOT EXISTS lgd_code   VARCHAR(20);
ALTER TABLE loc_blocks     ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS name_raw   VARCHAR(160) DEFAULT '';
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS lgd_code   VARCHAR(20);
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

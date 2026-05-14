-- ============================================================================
-- Migration 020: Bihar Location Hierarchy Master Tables
-- Purpose: State → District → Block → Panchayat with stable slug-based codes.
--          Designed for multi-state extensibility (Bihar first).
--
-- IDEMPOTENCY NOTE:
--   020_create_location_hierarchy.sql (also numbered 020) may have already run
--   and created these tables with different column names:
--     loc_districts: PK=district_code, name col=district_name
--     loc_blocks:    PK=block_code,    name col=block_name
--     loc_panchayats:PK=panchayat_code,name col=panchayat_name
--
--   This migration renames those to the canonical schema (PK=code, name=name)
--   that all later migrations (021, 024) depend on.
--   All operations are guarded with DO $$ IF NOT EXISTS $$ blocks so they are
--   safe to run multiple times.
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename legacy PK and name columns produced by the simpler 020 migration
-- ============================================================================

DO $$ BEGIN
  -- loc_districts: district_code → code
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_districts' AND column_name='district_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_districts' AND column_name='code'
  ) THEN
    ALTER TABLE loc_districts RENAME COLUMN district_code TO code;
  END IF;

  -- loc_districts: district_name → name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_districts' AND column_name='district_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_districts' AND column_name='name'
  ) THEN
    ALTER TABLE loc_districts RENAME COLUMN district_name TO name;
  END IF;

  -- loc_blocks: block_code → code
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_blocks' AND column_name='block_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_blocks' AND column_name='code'
  ) THEN
    ALTER TABLE loc_blocks RENAME COLUMN block_code TO code;
  END IF;

  -- loc_blocks: block_name → name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_blocks' AND column_name='block_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_blocks' AND column_name='name'
  ) THEN
    ALTER TABLE loc_blocks RENAME COLUMN block_name TO name;
  END IF;

  -- loc_panchayats: panchayat_code → code
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_panchayats' AND column_name='panchayat_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='loc_panchayats' AND column_name='code'
  ) THEN
    ALTER TABLE loc_panchayats RENAME COLUMN panchayat_code TO code;
  END IF;

  -- loc_panchayats: panchayat_name → name
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

-- ============================================================================
-- STEP 2: Create tables (no-op if already exist after renames above)
-- ============================================================================

-- ---- STATES -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loc_states (
    code        VARCHAR(4)   PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    name_raw    VARCHAR(120) NOT NULL DEFAULT '',
    lgd_code    VARCHAR(20),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---- DISTRICTS --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loc_districts (
    code        VARCHAR(24)  PRIMARY KEY,
    state_code  VARCHAR(4)   NOT NULL,
    name        VARCHAR(120) NOT NULL,
    name_raw    VARCHAR(120) NOT NULL DEFAULT '',
    lgd_code    VARCHAR(20),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---- BLOCKS -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loc_blocks (
    code           VARCHAR(60)  PRIMARY KEY,
    district_code  VARCHAR(24)  NOT NULL,
    name           VARCHAR(120) NOT NULL,
    name_raw       VARCHAR(120) NOT NULL DEFAULT '',
    lgd_code       VARCHAR(20),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---- PANCHAYATS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loc_panchayats (
    code        VARCHAR(100) PRIMARY KEY,
    block_code  VARCHAR(60)  NOT NULL,
    name        VARCHAR(160) NOT NULL,
    name_raw    VARCHAR(160) NOT NULL DEFAULT '',
    lgd_code    VARCHAR(20),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Add any missing columns to tables that existed before this migration
-- ============================================================================

ALTER TABLE loc_districts ADD COLUMN IF NOT EXISTS state_code  VARCHAR(4);
ALTER TABLE loc_districts ADD COLUMN IF NOT EXISTS name_raw    VARCHAR(120) DEFAULT '';
ALTER TABLE loc_districts ADD COLUMN IF NOT EXISTS lgd_code    VARCHAR(20);
ALTER TABLE loc_districts ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ;

ALTER TABLE loc_blocks ADD COLUMN IF NOT EXISTS district_code  VARCHAR(24);
ALTER TABLE loc_blocks ADD COLUMN IF NOT EXISTS name_raw       VARCHAR(120) DEFAULT '';
ALTER TABLE loc_blocks ADD COLUMN IF NOT EXISTS lgd_code       VARCHAR(20);
ALTER TABLE loc_blocks ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ;

ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS block_code  VARCHAR(60);
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS name_raw    VARCHAR(160) DEFAULT '';
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS lgd_code    VARCHAR(20);
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ;

-- ============================================================================
-- STEP 4: Widen VARCHAR columns that may be too narrow from the old schema
-- ============================================================================

ALTER TABLE loc_districts  ALTER COLUMN code TYPE VARCHAR(24);
ALTER TABLE loc_blocks     ALTER COLUMN code TYPE VARCHAR(60);
ALTER TABLE loc_panchayats ALTER COLUMN code TYPE VARCHAR(100);

-- ============================================================================
-- STEP 5: Create indexes (IF NOT EXISTS — safe to rerun)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_loc_states_lgd        ON loc_states(lgd_code);
CREATE INDEX IF NOT EXISTS idx_loc_districts_state   ON loc_districts(state_code);
CREATE INDEX IF NOT EXISTS idx_loc_districts_lgd     ON loc_districts(lgd_code);
CREATE INDEX IF NOT EXISTS idx_loc_blocks_district   ON loc_blocks(district_code);
CREATE INDEX IF NOT EXISTS idx_loc_blocks_lgd        ON loc_blocks(lgd_code);
CREATE INDEX IF NOT EXISTS idx_loc_panchayats_block  ON loc_panchayats(block_code);
CREATE INDEX IF NOT EXISTS idx_loc_panchayats_lgd    ON loc_panchayats(lgd_code);

-- ---- SOURCE METADATA / AUDIT TABLE -----------------------------------------
CREATE TABLE IF NOT EXISTS loc_source_runs (
    id          BIGSERIAL    PRIMARY KEY,
    run_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    state_code  VARCHAR(4)   NOT NULL,
    source_url  TEXT         NOT NULL,
    rows_upserted   INTEGER  NOT NULL DEFAULT 0,
    rows_rejected   INTEGER  NOT NULL DEFAULT 0,
    dry_run     BOOLEAN      NOT NULL DEFAULT FALSE,
    notes       TEXT
);

-- ---- UPDATED_AT TRIGGERS ---------------------------------------------------
CREATE OR REPLACE FUNCTION loc_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_loc_states_updated_at') THEN
    CREATE TRIGGER trg_loc_states_updated_at
        BEFORE UPDATE ON loc_states
        FOR EACH ROW EXECUTE FUNCTION loc_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_loc_districts_updated_at') THEN
    CREATE TRIGGER trg_loc_districts_updated_at
        BEFORE UPDATE ON loc_districts
        FOR EACH ROW EXECUTE FUNCTION loc_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_loc_blocks_updated_at') THEN
    CREATE TRIGGER trg_loc_blocks_updated_at
        BEFORE UPDATE ON loc_blocks
        FOR EACH ROW EXECUTE FUNCTION loc_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_loc_panchayats_updated_at') THEN
    CREATE TRIGGER trg_loc_panchayats_updated_at
        BEFORE UPDATE ON loc_panchayats
        FOR EACH ROW EXECUTE FUNCTION loc_touch_updated_at();
  END IF;
END $$;

-- ---- SEED: Bihar state row --------------------------------------------------
INSERT INTO loc_states (code, name, name_raw, lgd_code)
VALUES ('BR', 'Bihar', 'Bihar', '10')
ON CONFLICT (code) DO UPDATE SET
    name     = EXCLUDED.name,
    name_raw = EXCLUDED.name_raw,
    lgd_code = EXCLUDED.lgd_code;

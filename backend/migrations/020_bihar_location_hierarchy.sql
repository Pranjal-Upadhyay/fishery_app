-- ============================================================================
-- Migration 020: Bihar Location Hierarchy Master Tables
-- Purpose: State → District → Block → Panchayat with stable slug-based codes.
--          Designed for multi-state extensibility (Bihar first).
-- ============================================================================

-- ---- STATES -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loc_states (
    code        VARCHAR(4)   PRIMARY KEY,            -- e.g. 'BR'
    name        VARCHAR(120) NOT NULL,               -- canonical 'Bihar'
    name_raw    VARCHAR(120) NOT NULL,               -- source text
    lgd_code    VARCHAR(20),                         -- LGD / Census numeric code
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_states_lgd ON loc_states(lgd_code);

-- ---- DISTRICTS --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loc_districts (
    code        VARCHAR(20)  PRIMARY KEY,            -- 'BR-PATNA'
    state_code  VARCHAR(4)   NOT NULL REFERENCES loc_states(code) ON DELETE CASCADE,
    name        VARCHAR(120) NOT NULL,               -- canonical 'Patna'
    name_raw    VARCHAR(120) NOT NULL,               -- source text (preserves original)
    lgd_code    VARCHAR(20),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Guard: if table already existed (from 020_create_location_hierarchy.sql) it won't
-- have lgd_code / name / name_raw / updated_at — add them safely before indexing.
ALTER TABLE loc_districts ADD COLUMN IF NOT EXISTS name        VARCHAR(120);
ALTER TABLE loc_districts ADD COLUMN IF NOT EXISTS name_raw    VARCHAR(120);
ALTER TABLE loc_districts ADD COLUMN IF NOT EXISTS lgd_code    VARCHAR(20);
ALTER TABLE loc_districts ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_loc_districts_state   ON loc_districts(state_code);
CREATE INDEX IF NOT EXISTS idx_loc_districts_lgd     ON loc_districts(lgd_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_loc_districts_state_name
    ON loc_districts(state_code, name) WHERE name IS NOT NULL;

-- ---- BLOCKS -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loc_blocks (
    code           VARCHAR(40)  PRIMARY KEY,         -- 'BR-PATNA-PHULWARI'
    district_code  VARCHAR(20)  NOT NULL REFERENCES loc_districts(code) ON DELETE CASCADE,
    name           VARCHAR(120) NOT NULL,
    name_raw       VARCHAR(120) NOT NULL,
    lgd_code       VARCHAR(20),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Guard: same as above for blocks
ALTER TABLE loc_blocks ADD COLUMN IF NOT EXISTS name        VARCHAR(120);
ALTER TABLE loc_blocks ADD COLUMN IF NOT EXISTS name_raw    VARCHAR(120);
ALTER TABLE loc_blocks ADD COLUMN IF NOT EXISTS lgd_code    VARCHAR(20);
ALTER TABLE loc_blocks ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_loc_blocks_district   ON loc_blocks(district_code);
CREATE INDEX IF NOT EXISTS idx_loc_blocks_lgd        ON loc_blocks(lgd_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_loc_blocks_district_name
    ON loc_blocks(district_code, name) WHERE name IS NOT NULL;

-- ---- PANCHAYATS -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loc_panchayats (
    code        VARCHAR(80)  PRIMARY KEY,            -- 'BR-PATNA-PHULWARI-NAUBATPUR'
    block_code  VARCHAR(40)  NOT NULL REFERENCES loc_blocks(code) ON DELETE CASCADE,
    name        VARCHAR(160) NOT NULL,
    name_raw    VARCHAR(160) NOT NULL,
    lgd_code    VARCHAR(20),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Guard: same as above for panchayats
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS name        VARCHAR(160);
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS name_raw    VARCHAR(160);
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS lgd_code    VARCHAR(20);
ALTER TABLE loc_panchayats ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_loc_panchayats_block  ON loc_panchayats(block_code);
CREATE INDEX IF NOT EXISTS idx_loc_panchayats_lgd    ON loc_panchayats(lgd_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_loc_panchayats_block_name
    ON loc_panchayats(block_code, name) WHERE name IS NOT NULL;

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

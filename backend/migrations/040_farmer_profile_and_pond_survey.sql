-- ============================================================================
-- Migration 040: Farmer Profile & Pond Survey Fields
--
-- Adds the government survey form fields to users and ponds tables:
--   USERS  — household demographics, farming experience, scheme eligibility,
--            consent timestamp.
--   PONDS  — ownership, water availability, culture system category,
--            pond activity, 4 survey photos, insurance + risk history.
--
-- All new columns are additive and nullable so existing data is preserved
-- and the old signup flow continues to work.
-- ============================================================================

-- ─── USERS — Bucket 1 (farmer profile) ───────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS father_or_husband_name  VARCHAR(120),
    ADD COLUMN IF NOT EXISTS aadhaar_number          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS gender                  VARCHAR(20),
    ADD COLUMN IF NOT EXISTS date_of_birth           DATE,
    ADD COLUMN IF NOT EXISTS education_level         VARCHAR(40),
    ADD COLUMN IF NOT EXISTS household_size          INT,
    ADD COLUMN IF NOT EXISTS farming_experience_years INT,
    ADD COLUMN IF NOT EXISTS primary_occupation      VARCHAR(40),
    ADD COLUMN IF NOT EXISTS annual_income_range     VARCHAR(30),
    ADD COLUMN IF NOT EXISTS kcc_holder              BOOLEAN,
    ADD COLUMN IF NOT EXISTS bpl_holder              BOOLEAN,
    ADD COLUMN IF NOT EXISTS consent_given           BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consent_given_at        TIMESTAMPTZ;

-- Enum-style CHECK constraints (created only if absent — additive safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_gender_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_gender_check
            CHECK (gender IS NULL OR gender IN ('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_education_level_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_education_level_check
            CHECK (education_level IS NULL OR education_level IN (
                'NONE','PRIMARY','SECONDARY','HIGHER_SECONDARY','GRADUATE','POSTGRADUATE'
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_primary_occupation_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_primary_occupation_check
            CHECK (primary_occupation IS NULL OR primary_occupation IN (
                'FISH_FARMING','AGRICULTURE','DAIRY','LABOUR','BUSINESS','SERVICE','OTHER'
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_income_range_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_income_range_check
            CHECK (annual_income_range IS NULL OR annual_income_range IN (
                'LT_50K','50K_1L','1L_3L','3L_5L','GT_5L'
            ));
    END IF;
END $$;

-- ─── PONDS — Bucket 2 (per-pond survey fields) ───────────────────────────────

ALTER TABLE ponds
    ADD COLUMN IF NOT EXISTS ownership_type           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS water_availability       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS culture_system_category  VARCHAR(30),
    ADD COLUMN IF NOT EXISTS pond_activity_type       VARCHAR(30),
    ADD COLUMN IF NOT EXISTS wide_angle_photo_uri     TEXT,
    ADD COLUMN IF NOT EXISTS embankment_photo_uri     TEXT,
    ADD COLUMN IF NOT EXISTS close_view_photo_uri     TEXT,
    ADD COLUMN IF NOT EXISTS farmer_with_pond_photo_uri TEXT,
    ADD COLUMN IF NOT EXISTS is_insured               BOOLEAN,
    ADD COLUMN IF NOT EXISTS flood_impact_3yrs        BOOLEAN,
    ADD COLUMN IF NOT EXISTS disease_occurrence       VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ponds_ownership_type_check') THEN
        ALTER TABLE ponds ADD CONSTRAINT ponds_ownership_type_check
            CHECK (ownership_type IS NULL OR ownership_type IN ('OWNED','LEASED','SHARED','GOVT'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ponds_water_availability_check') THEN
        ALTER TABLE ponds ADD CONSTRAINT ponds_water_availability_check
            CHECK (water_availability IS NULL OR water_availability IN ('SEASONAL','PERENNIAL'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ponds_culture_system_category_check') THEN
        ALTER TABLE ponds ADD CONSTRAINT ponds_culture_system_category_check
            CHECK (culture_system_category IS NULL OR culture_system_category IN (
                'EXTENSIVE','SEMI_INTENSIVE','INTENSIVE'
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ponds_pond_activity_type_check') THEN
        ALTER TABLE ponds ADD CONSTRAINT ponds_pond_activity_type_check
            CHECK (pond_activity_type IS NULL OR pond_activity_type IN (
                'NURSERY','REARING','GROW_OUT','BROODSTOCK','MIXED'
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ponds_disease_occurrence_check') THEN
        ALTER TABLE ponds ADD CONSTRAINT ponds_disease_occurrence_check
            CHECK (disease_occurrence IS NULL OR disease_occurrence IN ('NONE','MINOR','MAJOR'));
    END IF;
END $$;

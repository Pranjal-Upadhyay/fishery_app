-- ============================================================================
-- Migration 045: Yojana Applications & DBT Transactions
-- ============================================================================

-- Create Yojana Applications Table
CREATE TABLE IF NOT EXISTS yojana_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pond_id UUID NOT NULL REFERENCES ponds(id) ON DELETE CASCADE,
    yojana_code VARCHAR(80) NOT NULL, -- e.g. 'JKSY', 'TMVSY', 'MPVY'
    status VARCHAR(40) NOT NULL DEFAULT 'AWAITING_REVIEW'
        CHECK (status IN ('AWAITING_REVIEW', 'DLC_QUEUE', 'APPROVED', 'MILESTONE_1_MET', 'MILESTONE_2_MET', 'REJECTED')),
    approved_subsidy_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yojana_applications_user ON yojana_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_yojana_applications_pond ON yojana_applications(pond_id);
CREATE INDEX IF NOT EXISTS idx_yojana_applications_status ON yojana_applications(status);

-- Create DBT Transactions Table (ledger of payout releases and farmer confirmations)
CREATE TABLE IF NOT EXISTS dbt_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES yojana_applications(id) ON DELETE CASCADE,
    milestone_index INT NOT NULL,
    utr_number VARCHAR(80) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'PROCESSING'
        CHECK (status IN ('SUCCESS', 'PROCESSING', 'FAILED')),
    farmer_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    farmer_confirmed_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dbt_transactions_app ON dbt_transactions(application_id);
CREATE INDEX IF NOT EXISTS idx_dbt_transactions_utr ON dbt_transactions(utr_number);
CREATE INDEX IF NOT EXISTS idx_dbt_transactions_status ON dbt_transactions(status);

-- Trigger to update updated_at on yojana_applications
DROP TRIGGER IF EXISTS update_yojana_applications_updated_at ON yojana_applications;
CREATE TRIGGER update_yojana_applications_updated_at
    BEFORE UPDATE ON yojana_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─── SEED TEST DATA ──────────────────────────────────────────────────────────

-- 1. Create a Seed Farmer User for Yojana Testing (password is 'ChangeMe!2026')
INSERT INTO users (
    id, phone_number, name, preferred_language, farmer_category, state_code,
    district_code, block_code, panchayat_code, password_hash, role
) VALUES (
    'f0000000-0000-0000-0000-000000000001',
    '+917777777777',
    'Ramesh Kumar Mahto',
    'en',
    'SC',
    'BR',
    'BR-MADHUBANI',
    'BR-MADHUBANI-SADAR',
    'BR-MADHUBANI-SADAR-MADHUBANI',
    '$2b$10$IHuMOtmLd.xfHd8V84ViruTL0mIOoYVDZ.5kYzYm02/2N.9Cq2EC.', -- bcrypt hash for 'ChangeMe!2026'
    'FARMER'
) ON CONFLICT (phone_number) DO NOTHING;

-- 2. Create a Seed Pond for this Farmer
INSERT INTO ponds (
    id, user_id, name, area_hectares, water_source_type, system_type,
    status, location, district_code, block_code, panchayat_code,
    ownership_type, water_availability, culture_system_category, pond_activity_type,
    wide_angle_photo_uri, embankment_photo_uri, close_view_photo_uri, farmer_with_pond_photo_uri,
    is_insured, flood_impact_3yrs, disease_occurrence
) VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'Madhubani Core Pond',
    0.5,
    'BOREWELL',
    'EARTHEN',
    'ACTIVE',
    ST_SetSRID(ST_MakePoint(86.0712, 26.3481), 4326)::geography, -- 26.3481 N, 86.0712 E
    'BR-MADHUBANI',
    'BR-MADHUBANI-SADAR',
    'BR-MADHUBANI-SADAR-MADHUBANI',
    'LEASED',
    'PERENNIAL',
    'SEMI_INTENSIVE',
    'GROW_OUT',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
    true,
    false,
    'NONE'
) ON CONFLICT (id) DO NOTHING;

-- 3. Create Seed Yojana Applications
INSERT INTO yojana_applications (
    id, user_id, pond_id, yojana_code, status, approved_subsidy_amount, milestones
) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'JKSY', -- Solar Pump
    'AWAITING_REVIEW',
    433600.00,
    '[
        {"name": "Borewell & Foundation", "pct": 40, "verified": false, "photoUrl": "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80"},
        {"name": "Solar panel & pump mount", "pct": 40, "verified": false},
        {"name": "Post-Stocking validation", "pct": 20, "verified": false}
    ]'::jsonb
),
(
    'a0000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'TMVSY', -- Pond excavation support
    'DLC_QUEUE',
    565600.00,
    '[
        {"name": "Excavation & Dykes Renovation", "pct": 50, "verified": true},
        {"name": "Water filling & Seed stocking", "pct": 50, "verified": false}
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 4. Create Seed DBT Transactions
INSERT INTO dbt_transactions (
    id, application_id, milestone_index, utr_number, amount, status, farmer_confirmed, farmer_confirmed_at, processed_at
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    0,
    'UTR-20260603-1104',
    282800.00, -- 50% of 565,600
    'SUCCESS',
    true,
    '2026-06-03 12:00:00+00',
    '2026-06-03 10:00:00+00'
) ON CONFLICT (id) DO NOTHING;

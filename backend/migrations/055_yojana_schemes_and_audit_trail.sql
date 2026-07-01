-- ============================================================================
-- Migration 055: Dynamic Yojana Schemes & Amendment Audit Logs
-- ============================================================================

-- Create Yojana Schemes configuration table
CREATE TABLE IF NOT EXISTS yojana_schemes (
    code VARCHAR(20) PRIMARY KEY,
    name_en VARCHAR(150) NOT NULL,
    name_hi VARCHAR(150) NOT NULL,
    tagline VARCHAR(250),
    description TEXT,
    subsidy_by_category JSONB NOT NULL,
    unit_cost_cap_lakh DECIMAL(12, 2) NOT NULL,
    max_subsidy_lakh DECIMAL(12, 2) NOT NULL,
    eligibility JSONB NOT NULL,
    required_documents JSONB NOT NULL,
    geofence VARCHAR(150),
    classification VARCHAR(80),
    accent_color VARCHAR(30) DEFAULT 'teal',
    milestones JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Yojana Scheme Amendments audit trail table
CREATE TABLE IF NOT EXISTS yojana_scheme_amendments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_code VARCHAR(20) REFERENCES yojana_schemes(code) ON DELETE CASCADE,
    amended_by UUID NOT NULL, -- Admin User ID
    change_summary TEXT NOT NULL,
    previous_data JSONB NOT NULL,
    new_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yojana_schemes_status ON yojana_schemes(status);
CREATE INDEX IF NOT EXISTS idx_yojana_amendments_scheme ON yojana_scheme_amendments(scheme_code);

-- Seed dynamic yojana data
INSERT INTO yojana_schemes (
    code, name_en, name_hi, tagline, description, subsidy_by_category, 
    unit_cost_cap_lakh, max_subsidy_lakh, eligibility, required_documents, 
    geofence, classification, accent_color, milestones, status
) VALUES 
(
    'PMMSY',
    'Pradhan Mantri Matsya Sampada Yojana',
    'प्रधान मंत्री मत्स्य संपदा योजना',
    'National Flagship Fisheries Development Scheme',
    'National Flagship Fisheries Development Scheme focused on primary and infrastructure development.',
    '{"general": 40, "ebc": 60, "sc": 60, "st": 60}'::jsonb,
    25.00,
    15.00,
    '["All fishers, fish farmers, SHGs, JLGs, and cooperatives", "Aadhaar-linked bank account is mandatory", "Land ownership or lease agreement (minimum 7 years)", "Must not have availed same scheme in previous 5 years", "Women beneficiaries get additional 10% priority access"]'::jsonb,
    '["AADHAAR", "LAND_DEED", "BANK_PASSBOOK", "POND_PHOTO", "CASTE_CERT", "INCOME_CERT"]'::jsonb,
    'All 38 Bihar Districts (National Scheme)',
    'Capital Infrastructure',
    'teal',
    '[{"name": "Establishment/Construction Phase", "pct": 50}, {"name": "Input/Stocking Phase", "pct": 50}]'::jsonb,
    'ACTIVE'
),
(
    'TMVSY',
    'Talab Matsyiki Vishesh Sahayata Yojana',
    'तालाब मात्स्यिकी विशेष सहायता योजना',
    'Special Pond Renovation & Construction Assistance',
    'Special assistance for pond development, dyke renovation, water supply installation, and seed/feed inputs.',
    '{"general": 50, "ebc": 70, "sc": 70, "st": 70}'::jsonb,
    10.10,
    7.07,
    '["SC, ST and EBC categories receive maximum 70% subsidy", "General category receives 50% subsidy", "Minimum 0.2 hectare pond area required", "Leased land must have agreement of minimum 9 years", "Fisheries training certificate preferred (not mandatory)"]'::jsonb,
    '["AADHAAR", "CASTE_CERT", "LAND_DEED", "BANK_PASSBOOK", "PASSPORT_PHOTO", "POND_PHOTO"]'::jsonb,
    'All 38 Bihar Districts',
    'Pond Infrastructure',
    'sky',
    '[{"name": "Excavation & Dykes Renovation", "pct": 50}, {"name": "Water filling & Seed stocking", "pct": 50}]'::jsonb,
    'ACTIVE'
),
(
    'JKSY',
    'Jalkrishi Saurikaran Yojana',
    'जलकृषि सौरीकरण योजना',
    'Solar-Powered Pump & Aeration Infrastructure',
    'Provides solar powered irrigation pumps for aquaculture operations, eliminating fossil fuel costs and reducing grid dependence.',
    '{"general": 80, "ebc": 80, "sc": 80, "st": 80}'::jsonb,
    5.42,
    4.34,
    '["All caste categories equally eligible (uniform 80% subsidy)", "Land lease agreement of minimum 9 years required", "Existing operational fish or shrimp pond is mandatory", "North Bihar applicants: 5 HP solar pump eligible", "South Bihar applicants: 7.5 HP solar pump eligible"]'::jsonb,
    '["AADHAAR", "LAND_DEED", "BANK_PASSBOOK", "POWER_PROOF", "POND_PHOTO"]'::jsonb,
    'North Bihar (5 HP) | South Bihar (7.5 HP)',
    'Solar Infrastructure',
    'amber',
    '[{"name": "Borewell & Foundation", "pct": 40}, {"name": "Solar panel & pump mount", "pct": 40}, {"name": "Post-Stocking validation", "pct": 20}]'::jsonb,
    'ACTIVE'
),
(
    'MPVY',
    'Matsya Prajati Vividhikaran Yojana',
    'मत्स्य प्रजाति का विविधीकरण योजना',
    'Species Diversification & Hatchery Development',
    'Assistance for setting up modern hatcheries for high-value species diversification (e.g. Scampi, Catfish, Sea Bass).',
    '{"general": 60, "ebc": 60, "sc": 60, "st": 60}'::jsonb,
    13.12,
    7.87,
    '["Prior aquaculture training certificate from fisheries dept.", "Minimum 0.5 hectare water body required", "Land lease agreement of minimum 9 years", "Minimum 2 years of documented fish farming experience", "Active fish farming with existing crop cycle records"]'::jsonb,
    '["AADHAAR", "LAND_DEED", "BANK_PASSBOOK", "TRAINING_CERT", "POND_PHOTO"]'::jsonb,
    'Designated hatchery districts only',
    'Hatchery & Diversification',
    'violet',
    '[{"name": "Initial Infrastructure Setup", "pct": 50}, {"name": "Stocking & Input Validation", "pct": 50}]'::jsonb,
    'ACTIVE'
)
ON CONFLICT (code) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    name_hi = EXCLUDED.name_hi,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    subsidy_by_category = EXCLUDED.subsidy_by_category,
    unit_cost_cap_lakh = EXCLUDED.unit_cost_cap_lakh,
    max_subsidy_lakh = EXCLUDED.max_subsidy_lakh,
    eligibility = EXCLUDED.eligibility,
    required_documents = EXCLUDED.required_documents,
    geofence = EXCLUDED.geofence,
    classification = EXCLUDED.classification,
    accent_color = EXCLUDED.accent_color,
    milestones = EXCLUDED.milestones,
    status = EXCLUDED.status;

-- ============================================================================
-- Migration 042: Bihar Yojana Knowledge Rules
-- Source: Bihar Govt + Central Govt Aquaculture Schemes (FY 2025-26)
-- Schemes: PMMSY, Mukhyamantri Talab Matsyiki Vikas, Jalkrishi Saurikaran,
--          Biofloc/RAS/Cage schemes, Species Diversification Yojana
-- ============================================================================

-- ── 1. Bihar-specific subsidy percentages (override national defaults) ────────

-- General category: Bihar gives 50% (PMMSY + state top-up), vs national 40%
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-pmmsy-subsidy-general',
  'subsidy_rule',
  'Bihar Aquaculture Schemes FY 2025-26',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', 'STANDARD_STATES',
  '["POND_CULTURE","BRACKISHWATER","INTEGRATED_FARMING","ALL"]'::jsonb,
  '[]'::jsonb,
  'Beneficiary Subsidy — General Category (Bihar)',
  50, 'PERCENT', 'subsidy',
  'HIGH', '2025-26',
  true, true,
  'Mukhyamantri Talab Matsyiki Vikas Yojana: 50% subsidy for General category (₹1629.59L total allocation)',
  'Applies to all pond-based, Biofloc, RAS, Cage, and wetland schemes under PMMSY+state co-funding in Bihar'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- SC/ST/EBC category: Bihar gives 70%
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-pmmsy-subsidy-priority',
  'subsidy_rule',
  'Bihar Aquaculture Schemes FY 2025-26',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', 'STANDARD_STATES',
  '["POND_CULTURE","BRACKISHWATER","INTEGRATED_FARMING","ALL"]'::jsonb,
  '[]'::jsonb,
  'Beneficiary Subsidy — SC/ST/EBC Priority Category (Bihar)',
  70, 'PERCENT', 'subsidy',
  'HIGH', '2025-26',
  true, true,
  'Bihar schemes: SC/ST/EBC receive 70% subsidy. Talab Matsyiki Vishesh Sahayata targets 749 units (SC/ST/EBC only, ₹2998.99L)',
  'EBC (Extremely Backward Class) treated same as SC/ST for subsidy eligibility in Bihar state yojanas'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- RAS subsidy for Bihar (50% General, 70% SC/ST/EBC — same tiers apply)
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-ras-subsidy-general',
  'subsidy_rule',
  'PMMSY 5-Year Physical Targets 2020-2025',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', 'STANDARD_STATES',
  '["RAS"]'::jsonb,
  '[]'::jsonb,
  'RAS Subsidy — General Category (Bihar)',
  50, 'PERCENT', 'subsidy',
  'HIGH', '2025-26',
  true, true,
  'Small RAS (100m³): unit cost ₹7.50L. Medium RAS (180m³): ₹25L. Large RAS (720m³): ₹50L. 50% for General.',
  'PMMSY 5-year targets: 55 small, 20 medium, 10 large RAS units across Bihar'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- ── 2. Bihar-specific cost benchmarks ────────────────────────────────────────

-- Solar pump: 80% subsidy (Jalkrishi Saurikaran — highest in any scheme)
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  warning_if_used, citation_text, notes
) VALUES (
  'bihar-solar-pump-subsidy',
  'subsidy_rule',
  'Jalkrishi Saurikaran — Bihar Solar Submersible Pump Scheme',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE","ALL"]'::jsonb,
  '[]'::jsonb,
  'Solar Pump Subsidy (Jalkrishi Saurikaran)',
  80, 'PERCENT', 'subsidy',
  'HIGH', '2025-26',
  false, true,
  false,
  'Jalkrishi Saurikaran: 80% subsidy for ALL categories. North Bihar: 5 HP pump (₹4.28L avg). South Bihar: 7.5 HP (₹5.42L avg). Budget ₹1364L.',
  'Requires 9-year land lease, ISI mark equipment, govt-empanelled supplier. Bars prior tube-well beneficiaries.'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- Pond construction cost benchmark: ₹10.10L/acre = ~₹25L/ha (Talab Matsyiki Vishesh Sahayata)
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, min_value, max_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-pond-construction-cost-per-ha',
  'cost_benchmark',
  'Bihar Aquaculture Schemes FY 2025-26',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE"]'::jsonb,
  '[]'::jsonb,
  'Pond Construction Cost (Full Package)',
  2499500, 1413000, 2499500, 'INR_PER_HA', 'capex',
  'HIGH', '2025-26',
  true, true,
  'Talab Matsyiki Vishesh Sahayata: ₹10.10L/acre (₹25L/ha) comprehensive package including boring, pump, inputs, shed, aerator.',
  'Minimum unit 0.4 acres (₹5.72L total). Maximum 1.0 acre. Restricted to SC/ST/EBC only.'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- Biofloc setup cost benchmark: ₹1.07L/tank (from PMMSY small unit: ₹7.5L / 7 tanks)
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, min_value, max_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-biofloc-capex-per-tank',
  'cost_benchmark',
  'PMMSY 5-Year Physical Targets 2020-2025',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE"]'::jsonb,
  '[]'::jsonb,
  'Biofloc Setup Cost Per Tank (10,000L unit)',
  107143, 100000, 107143, 'INR', 'capex',
  'HIGH', '2025-26',
  true, true,
  'PMMSY: Small Biofloc (7 tanks) = ₹7.50L → ₹1.07L/tank. Medium (25 tanks) = ₹25L. Large (50 tanks) = ₹50L.',
  'Cost includes tank, aeration blower, plumbing, support structure, electrical — not just tarpaulin.'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- RAS setup cost benchmark: ₹7.5L per 100m³ unit
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, min_value, max_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-ras-capex-per-unit',
  'cost_benchmark',
  'PMMSY 5-Year Physical Targets 2020-2025',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["RAS"]'::jsonb,
  '[]'::jsonb,
  'RAS Setup Cost Per Unit (100m³)',
  750000, 750000, 5000000, 'INR', 'capex',
  'HIGH', '2025-26',
  true, true,
  'PMMSY: Small RAS (100m³) = ₹7.50L. Medium RAS (6×30m³ = 180m³) = ₹25L. Large RAS (8×90m³ = 720m³) = ₹50L.',
  '55 small, 20 medium, 10 large RAS units targeted across Bihar under PMMSY 5-year plan.'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  max_value = EXCLUDED.max_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- Cage culture cost: ₹3L/cage, max 18 cages per individual, 72 for groups
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-cage-capex-per-unit',
  'cost_benchmark',
  'Jalashay Matsyiki Vikas Yojana — Bihar Reservoir Cage Scheme',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE"]'::jsonb,
  '[]'::jsonb,
  'Cage Culture Setup Cost Per Cage',
  300000, 'INR', 'capex',
  'HIGH', '2025-26',
  true, true,
  'Jalashay Matsyiki Vikas: ₹3L/cage. Subsidy: 60% General, 80% SC/ST. Budget ₹2201.44L. Targets 7 districts.',
  'Max 18 cages/individual, 72 cages/cooperative. Disbursement: 60% post-construction, 40% post-fingerling stocking.'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- Hatchery construction: carp hatchery ₹8L/unit, renovation ₹5L/unit
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, min_value, max_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-hatchery-capex',
  'cost_benchmark',
  'Bihar Aquaculture Schemes FY 2025-26',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE","ALL"]'::jsonb,
  '[]'::jsonb,
  'Carp Hatchery Construction Cost',
  800000, 500000, 1537000, 'INR', 'capex',
  'HIGH', '2025-26',
  false, true,
  'Mukhyamantri Talab Matsyiki: New carp hatchery ₹8L/unit, renovation ₹5L/unit. Species diversification: Minor Carp hatchery ₹13.12L, Catfish ₹15.37L.',
  '128 new carp hatchery input units + 30 renovations targeted. 766 advanced seed production units (0.5 acres each) at ₹1L/unit.'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  max_value = EXCLUDED.max_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- ── 3. Bihar aquaculture biological benchmarks ────────────────────────────────

-- Minor carp species: premium market price ₹150-200/kg (Bata, Reba, Labeo gonius)
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, min_value, max_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-minor-carp-market-price',
  'cost_benchmark',
  'Matsya Prajati Vividhikaran Yojana — Bihar Species Diversification',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE"]'::jsonb,
  '["labeo rohita","bata","reba","labeo gonius","minor carp"]'::jsonb,
  'Minor Carp Market Price (Bihar farm gate)',
  175, 150, 200, 'INR_PER_KG', 'revenue',
  'MEDIUM', '2025-26',
  true, true,
  'Species Diversification Yojana: Minor Carps (Bata, Reba, Labeo gonius) at premium price. 60% subsidy. Culture: ₹0.94L per 0.5 acre (6,000 fry stocking).',
  'Minor carps are climate-resilient, tolerate poor water quality, and command premium prices vs major carps.'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- Desi Catfish (Magur/Singhi/Pabda): ₹160-220/kg — air-breathing, climate resilient
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, min_value, max_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-catfish-market-price',
  'cost_benchmark',
  'Matsya Prajati Vividhikaran Yojana — Bihar Species Diversification',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE"]'::jsonb,
  '["magur","singhi","pabda","ompok pabda","clarias batrachus","heteropneustes fossilis"]'::jsonb,
  'Desi Catfish Market Price — Magur/Singhi/Pabda (Bihar)',
  190, 160, 220, 'INR_PER_KG', 'revenue',
  'HIGH', '2025-26',
  true, true,
  'Species Diversification Yojana: Catfish hatchery (Magur/Singhi/Pabda) at ₹15.37L/hatchery. Culture: ₹1.35L/0.5 acre (10,000 fry). 60% subsidy.',
  'Air-breathing catfish tolerate DO fluctuations better than carps. Strong local demand in Bihar and West Bengal.'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- Bihar Rohu/major carp market price baseline
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, min_value, max_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-major-carp-market-price',
  'cost_benchmark',
  'Bihar Economic Survey 2025-26',
  'GOVERNMENT_POLICY',
  'Government of Bihar — Planning & Development Department',
  'STATE', 'BR', NULL,
  '["POND_CULTURE"]'::jsonb,
  '["labeo rohita","catla","cirrhinus mrigala","rohu","major carp"]'::jsonb,
  'Major Carp Market Price — Rohu/Catla (Bihar farm gate)',
  110, 90, 130, 'INR_PER_KG', 'revenue',
  'HIGH', '2025-26',
  true, true,
  'Bihar fish production reached 960 thousand tonnes with 9.9% growth. Madhubani leading district. Major carps dominate volume.',
  'Major carp prices are lower than minor carps or catfish but higher throughput per acre of pond area.'
) ON CONFLICT (id_slug) DO UPDATE SET
  numeric_value = EXCLUDED.numeric_value,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  citation_text = EXCLUDED.citation_text,
  updated_at = NOW();

-- ── 4. Policy highlights for PolicyGuidanceScreen ────────────────────────────

-- Training scheme (Matsya Prasar Yojana) — fully subsidized
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-matsya-prasar-training',
  'policy_rule',
  'Matsya Prasar Yojana — Bihar Fisheries Extension Scheme',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["ALL"]'::jsonb,
  '[]'::jsonb,
  'Free Training & Exposure Visits (Matsya Prasar Yojana)',
  100, 'PERCENT', 'training',
  'HIGH', '2025-26',
  false, true,
  'Matsya Prasar Yojana: ₹945.61L budget. 9,455 trainees (8,605 intra-state, 850 inter-state). Bhraman Darshan: 5,880 farmers in 294 batches of 20.',
  'Registration fee: ₹100 intra-state, ₹250 inter-state (Kakinada). Apply via block-level Matsyajivi Sahyog Samiti.'
) ON CONFLICT (id_slug) DO UPDATE SET
  citation_text = EXCLUDED.citation_text,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Accidental insurance (PMMSY Group Insurance) — 100% subsidized
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-pmmsy-group-insurance',
  'policy_rule',
  'PMMSY Group Accidental Insurance — Bihar',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["ALL"]'::jsonb,
  '[]'::jsonb,
  'PMMSY Group Accidental Insurance (Free for Fishers)',
  100, 'PERCENT', 'insurance',
  'HIGH', '2025-26',
  false, true,
  'PMMSY Group Accidental Insurance: ₹91/member/year premium, 100% subsidized (60% Centre + 40% State). 1.5 lakh fishers in Bihar.',
  'Auto-enroll verified Matsyajivi Sahyog Samiti members. Supplementary contingency fund: ₹4/member extra premium.'
) ON CONFLICT (id_slug) DO UPDATE SET
  citation_text = EXCLUDED.citation_text,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- PM-MKSSY aquaculture crop insurance incentive
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-pm-mkssy-insurance',
  'policy_rule',
  'PM-MKSSY Component 1B — Aquaculture Insurance Incentive',
  'GOVERNMENT_POLICY',
  'Ministry of Fisheries, Animal Husbandry and Dairying, Government of India',
  'NATIONAL', NULL, NULL,
  '["ALL"]'::jsonb,
  '[]'::jsonb,
  'PM-MKSSY Crop Insurance Premium Subsidy',
  40, 'PERCENT', 'insurance',
  'HIGH', '2025-26',
  false, true,
  'PM-MKSSY Component 1B: 40% of aquaculture insurance premium covered (one-time incentive). Ponds: ₹25,000/ha cap (max 4 ha). SC/ST/Women: +10% incentive.',
  'National scheme FY 2023-24 to 2026-27. ₹6,000+ crore national investment. Apply via NFDP digital identity.'
) ON CONFLICT (id_slug) DO UPDATE SET
  citation_text = EXCLUDED.citation_text,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ── 5. Risk flags for Bihar-specific operations ───────────────────────────────

-- Chaur/wetland development: geofenced to north Bihar (22 districts)
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  warning_if_used, citation_text, notes
) VALUES (
  'bihar-chaur-north-only',
  'risk_flag',
  'Mukhyamantri Samekit Chaur Vikas Yojana',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE"]'::jsonb,
  '[]'::jsonb,
  'Chaur Development: Restricted to North Bihar (22 flood-prone districts)',
  NULL, NULL, 'eligibility',
  'HIGH', '2025-26',
  false, true,
  true,
  'Mukhyamantri Samekit Chaur Vikas Yojana: ₹3119.42L. 600 ha targeted. Beneficiary Model: 50-70% subsidy. Entrepreneur Model (>20ha): 40% subsidy, ₹5Cr cap.',
  'Geofenced to 22 districts along Ganga, Gandak, and Bagmati rivers. GIS coordinates required. Overlap detection for large-scale applications.'
) ON CONFLICT (id_slug) DO UPDATE SET
  citation_text = EXCLUDED.citation_text,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Plateau/pathari schemes: south Bihar only (8 districts)
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  warning_if_used, citation_text, notes
) VALUES (
  'bihar-plateau-south-only',
  'risk_flag',
  'Pathari Kshetra Talab Nirman Yojana',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE"]'::jsonb,
  '[]'::jsonb,
  'Plateau Pond Scheme: Only for Banka, Aurangabad, Gaya, Kaimur, Nawada, Jamui, Munger, Rohtas',
  80, 'PERCENT', 'eligibility',
  'HIGH', '2025-26',
  false, true,
  true,
  'Pathari Kshetra Talab Nirman: 80% subsidy. Rocky subsoil requires special excavation. Budget: ₹2919L for 353 units (SC+ST only). Unit cost ₹16.70L/acre.',
  'Geofenced to 8 southern districts. Auto-reject applications from other districts. SC/ST only — no General or EBC beneficiaries.'
) ON CONFLICT (id_slug) DO UPDATE SET
  citation_text = EXCLUDED.citation_text,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Feed cost benchmark: feed mills in Bihar get ₹3/unit electricity subsidy
INSERT INTO knowledge_rules (
  id_slug, record_type, document_title, source_type, institution,
  scope_type, state_code, region_group,
  project_types, species, metric_name,
  numeric_value, unit, bucket,
  confidence, freshness, active_for_calculator, active_for_knowledgebase,
  citation_text, notes
) VALUES (
  'bihar-feed-electricity-subsidy',
  'cost_benchmark',
  'Fish Feed Mill Vidyut Sahayata Yojana — Bihar',
  'GOVERNMENT_POLICY',
  'Department of Animal and Fisheries Resources, Government of Bihar',
  'STATE', 'BR', NULL,
  '["POND_CULTURE","ALL"]'::jsonb,
  '[]'::jsonb,
  'Feed Mill Electricity Subsidy (₹3/unit)',
  3, 'INR', 'opex',
  'HIGH', '2025-26',
  false, true,
  'Feed Mill Electricity Subsidy: ₹3/unit on commercial electricity (150 units/ton benchmark). 53 existing mills. Cap: ₹2L/month for 100-ton mills.',
  'Subsidy keeps locally produced pelleted feed competitive vs Andhra Pradesh imports. Applied via monthly bill + production log upload.'
) ON CONFLICT (id_slug) DO UPDATE SET
  citation_text = EXCLUDED.citation_text,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Ensure unique constraint exists (self-healing for schema drift)
DELETE FROM market_prices a USING market_prices b
WHERE a.id < b.id 
  AND a.species_id = b.species_id 
  AND a.market_name = b.market_name 
  AND a.date = b.date;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_market_price'
    ) THEN
        ALTER TABLE market_prices ADD CONSTRAINT unique_market_price UNIQUE (species_id, market_name, date);
    END IF;
END $$;

-- 1. Insert Amur Carp SPECIES node
INSERT INTO knowledge_nodes (id, parent_id, node_type, data)
VALUES (
  '11111111-1111-1111-1111-111111111114',
  '00000000-0000-0000-0000-000000000001',
  'SPECIES',
  '{
    "scientific_name": "Cyprinus carpio haematopterus",
    "common_names": {"en": "Amur Carp", "hi": "अमुर कार्प"},
    "category": "EXOTIC_CARP",
    "description": "🐟 Amur Carp is a genetically improved Hungarian strain of Common Carp. It is highly popular in India due to its 30-40% faster growth rate, delayed sexual maturity (which prevents unwanted breeding in grow-out ponds), and high disease resistance. It is very hardy and performs exceptionally well in low-input polyculture systems.",
    "biological_parameters": {
      "temperature_celsius": {"min": 15.0, "max": 32.0},
      "dissolved_oxygen_mg_l": {"min": 4.0, "max": null},
      "ph_range": {"min": 6.5, "max": 9.0},
      "salinity_tolerance_ppt": {"min": 0.0, "max": 5.0}
    },
    "economic_parameters": {
      "feed_conversion_ratio": {"min": 1.4, "max": 1.8},
      "expected_yield_mt_per_acre": {"min": 3.5, "max": 6.0},
      "market_price_per_kg_inr": {"min": 110.0, "max": 150.0},
      "survival_rate_percent": {"min": 80.0, "max": 88.0}
    },
    "culture_period_months": {"min": 6, "max": 10},
    "crops_per_year": {"min": 1, "max": null},
    "optimal_systems": ["TRADITIONAL_POND", "BIOFLOC", "RAS"],
    "notes": "Hungarian strain of common carp; 30-40% faster growth than local common carp; delayed maturity prevents overcrowding."
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 2. Seed market prices for key states to avoid empty state lists (AP, WB, KA, BR, UP)
-- IDs of target species:
-- Rohu: '11111111-1111-1111-1111-111111111111'
-- Catla: '11111111-1111-1111-1111-111111111112'
-- Common Carp: 'bcd65b41-e496-4ba5-bc62-e003d301dcd3'
-- Amur Carp: '11111111-1111-1111-1111-111111111114'
-- Vannamei Shrimp: '11111111-1111-1111-1111-111111111113'

-- Seed Andhra Pradesh (AP)
INSERT INTO market_prices (species_id, species_name, market_name, state_code, price_inr_per_kg, grade, date, source, volume_kg)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Rohu', 'Nellore Wholesale Fish Market', 'AP', 155.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 1200),
  ('11111111-1111-1111-1111-111111111112', 'Catla', 'Nellore Wholesale Fish Market', 'AP', 165.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 800),
  ('11111111-1111-1111-1111-111111111114', 'Amur Carp', 'Nellore Wholesale Fish Market', 'AP', 125.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 600),
  ('11111111-1111-1111-1111-111111111113', 'Vannamei Shrimp', 'Bhimavaram Export Hub', 'AP', 410.00, 'Premium', CURRENT_DATE, 'MANUAL_ENTRY', 3500)
ON CONFLICT (species_id, market_name, date) DO UPDATE 
SET price_inr_per_kg = EXCLUDED.price_inr_per_kg, volume_kg = EXCLUDED.volume_kg;

-- Seed West Bengal (WB)
INSERT INTO market_prices (species_id, species_name, market_name, state_code, price_inr_per_kg, grade, date, source, volume_kg)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Rohu', 'Howrah Wholesale Fish Market', 'WB', 175.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 2500),
  ('11111111-1111-1111-1111-111111111112', 'Catla', 'Howrah Wholesale Fish Market', 'WB', 190.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 1800),
  ('11111111-1111-1111-1111-111111111114', 'Amur Carp', 'Howrah Wholesale Fish Market', 'WB', 135.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 900),
  ('11111111-1111-1111-1111-111111111113', 'Vannamei Shrimp', 'Kolkata Airport Cargo Hub', 'WB', 430.00, 'Premium', CURRENT_DATE, 'MANUAL_ENTRY', 2000)
ON CONFLICT (species_id, market_name, date) DO UPDATE 
SET price_inr_per_kg = EXCLUDED.price_inr_per_kg, volume_kg = EXCLUDED.volume_kg;

-- Seed Karnataka (KA)
INSERT INTO market_prices (species_id, species_name, market_name, state_code, price_inr_per_kg, grade, date, source, volume_kg)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Rohu', 'Yeshwanthpur Fish Market', 'KA', 160.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 1100),
  ('11111111-1111-1111-1111-111111111112', 'Catla', 'Yeshwanthpur Fish Market', 'KA', 170.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 950),
  ('11111111-1111-1111-1111-111111111114', 'Amur Carp', 'Yeshwanthpur Fish Market', 'KA', 128.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 500)
ON CONFLICT (species_id, market_name, date) DO UPDATE 
SET price_inr_per_kg = EXCLUDED.price_inr_per_kg, volume_kg = EXCLUDED.volume_kg;

-- Seed Bihar (BR)
INSERT INTO market_prices (species_id, species_name, market_name, state_code, price_inr_per_kg, grade, date, source, volume_kg)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Rohu', 'Patna Bazar Samiti', 'BR', 180.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 1500),
  ('11111111-1111-1111-1111-111111111112', 'Catla', 'Patna Bazar Samiti', 'BR', 195.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 1200),
  ('11111111-1111-1111-1111-111111111114', 'Amur Carp', 'Patna Bazar Samiti', 'BR', 140.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 800)
ON CONFLICT (species_id, market_name, date) DO UPDATE 
SET price_inr_per_kg = EXCLUDED.price_inr_per_kg, volume_kg = EXCLUDED.volume_kg;

-- Seed Uttar Pradesh (UP)
INSERT INTO market_prices (species_id, species_name, market_name, state_code, price_inr_per_kg, grade, date, source, volume_kg)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Rohu', 'Lucknow Mandi', 'UP', 165.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 1600),
  ('11111111-1111-1111-1111-111111111112', 'Catla', 'Lucknow Mandi', 'UP', 175.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 1100),
  ('11111111-1111-1111-1111-111111111114', 'Amur Carp', 'Lucknow Mandi', 'UP', 130.00, 'Medium', CURRENT_DATE, 'MANUAL_ENTRY', 700)
ON CONFLICT (species_id, market_name, date) DO UPDATE 
SET price_inr_per_kg = EXCLUDED.price_inr_per_kg, volume_kg = EXCLUDED.volume_kg;

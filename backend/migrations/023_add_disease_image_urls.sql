-- Migration 023: Add image_url column to diseases table and seed Wikipedia Commons URLs
-- Fixes blank images in Disease Intelligence / Disease Center screens

ALTER TABLE diseases ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update each disease with a reliable Wikipedia Commons image URL
UPDATE diseases SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/3/32/Columnaris_disease.jpg'
  WHERE slug = 'columnaris';

UPDATE diseases SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/0f/EUS_red_spot_disease_in_fish.jpg'
  WHERE slug = 'aeromonas-septicemia';

UPDATE diseases SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/8/83/White_spot_syndrome_virus.jpg'
  WHERE slug = 'white-spot-syndrome';

UPDATE diseases SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/6/62/White_Spot_disease_causing_Ichthyophthirius_multifiliis.jpg'
  WHERE slug = 'ich-white-spot';

UPDATE diseases SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Saprolegnia_on_fish_eggs.jpg'
  WHERE slug = 'saprolegniasis';

UPDATE diseases SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/1/19/Aerator_in_fish_pond%2C_Thailand.jpg'
  WHERE slug = 'oxygen-depletion';

UPDATE diseases SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/b/b5/YSI_multiparameter_water_quality_sonde.jpg'
  WHERE slug = 'ammonia-toxicity';

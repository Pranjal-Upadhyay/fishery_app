-- Migration 056: Dynamic Yojana Form Fields
ALTER TABLE yojana_schemes ADD COLUMN IF NOT EXISTS form_fields JSONB DEFAULT '[]'::jsonb;
ALTER TABLE yojana_applications ADD COLUMN IF NOT EXISTS dynamic_fields JSONB DEFAULT '{}'::jsonb;

-- Seed form fields for JKSY (Solar Pump)
UPDATE yojana_schemes 
SET form_fields = '[
  {
    "name": "pump_hp",
    "label": "Solar Pump Horsepower (HP)",
    "type": "number",
    "required": true,
    "min": 1,
    "max": 15,
    "placeholder": "e.g. 5"
  },
  {
    "name": "solar_panel_capacity_kw",
    "label": "Solar Panel Capacity (kW)",
    "type": "number",
    "required": true,
    "min": 1,
    "max": 20,
    "placeholder": "e.g. 3.5"
  },
  {
    "name": "borewell_depth_ft",
    "label": "Borewell Depth (feet)",
    "type": "number",
    "required": true,
    "min": 50,
    "max": 500,
    "placeholder": "e.g. 150"
  }
]'::jsonb
WHERE code = 'JKSY';

-- Seed form fields for TMVSY (Talab Matsyiki)
UPDATE yojana_schemes 
SET form_fields = '[
  {
    "name": "soil_type",
    "label": "Pond Soil Type",
    "type": "select",
    "required": true,
    "options": ["Clayey", "Loamy", "Sandy", "Clay-Loam"],
    "placeholder": "Select soil type"
  },
  {
    "name": "excavation_depth_meters",
    "label": "Planned Excavation Depth (meters)",
    "type": "number",
    "required": true,
    "min": 1,
    "max": 5,
    "placeholder": "e.g. 2"
  },
  {
    "name": "water_source",
    "label": "Primary Water Source",
    "type": "select",
    "required": true,
    "options": ["Borewell", "Canal", "River/Stream", "Rainfed"],
    "placeholder": "Select water source"
  }
]'::jsonb
WHERE code = 'TMVSY';

-- Seed form fields for MPVY (Diversification)
UPDATE yojana_schemes 
SET form_fields = '[
  {
    "name": "target_species",
    "label": "Target Diversified Species",
    "type": "select",
    "required": true,
    "options": ["Monosex Tilapia", "Pangasius", "Scampi", "Murrel", "Jayanti Rohu"],
    "placeholder": "Select species"
  },
  {
    "name": "planned_stocking_density",
    "label": "Planned Stocking Density (fingerlings/ha)",
    "type": "number",
    "required": true,
    "min": 5000,
    "max": 50000,
    "placeholder": "e.g. 15000"
  }
]'::jsonb
WHERE code = 'MPVY';

-- Seed form fields for PMMSY (Pradhan Mantri Matsya Sampada Yojana)
UPDATE yojana_schemes 
SET form_fields = '[
  {
    "name": "project_type",
    "label": "PMMSY Project Sub-type",
    "type": "select",
    "required": true,
    "options": ["New Pond Construction", "Input Subsidy for Finfish", "Rehabilitation of Ponds", "Biofloc/RAS Installation"],
    "placeholder": "Select project type"
  },
  {
    "name": "proposed_cost_lakh",
    "label": "Proposed Project Cost (Lakh INR)",
    "type": "number",
    "required": true,
    "min": 0.5,
    "max": 100,
    "placeholder": "e.g. 4.5"
  }
]'::jsonb
WHERE code = 'PMMSY';

-- Migration 032: Seed Government-Backed Suppliers and Audited Equipment Images
-- This migration updates the equipment_catalog table.
-- It seeds the 'supplier_info' JSONB column with official empaneled suppliers for matching inland aquaculture equipment.
-- It also performs a complete image audit, seeding highly accurate public domain pictures or setting them to NULL to trigger clean vector icon fallbacks in the mobile UI.

-- Update COMSYN & RK and Sons items
UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "M/s Commercial Syn Bags Limited (COMSYN)",
            "address": "Registered Office: Commercial House, 3-4, Jaora Compound, M.Y.H. Road, Indore - 452001, Madhya Pradesh, India",
            "scope": "Low-density polyethylene (LDPE) pond liners, geomembranes, geotextile fabrics for waterproof pond lining, heavy-duty tarpaulins, FIBC bags, and food-grade sacks",
            "phone": "+91-731-4279525",
            "email": "comsyn@comsyn.com",
            "validity": "Valid up to July 31, 2024",
            "is_government_backed": true
        },
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Tarpaulin_tank_aquaculture.jpg/640px-Tarpaulin_tank_aquaculture.jpg'
WHERE name = '9m Diameter PVC Tarpaulin Tank';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "M/s Commercial Syn Bags Limited (COMSYN)",
            "address": "Registered Office: Commercial House, 3-4, Jaora Compound, M.Y.H. Road, Indore - 452001, Madhya Pradesh, India",
            "scope": "Low-density polyethylene (LDPE) pond liners, geomembranes, geotextile fabrics for waterproof pond lining, heavy-duty tarpaulins, FIBC bags, and food-grade sacks",
            "phone": "+91-731-4279525",
            "email": "comsyn@comsyn.com",
            "validity": "Valid up to July 31, 2024",
            "is_government_backed": true
        },
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = NULL
WHERE name = 'Biofloc Tarpaulin Tank (10,000 L)';

-- Update Dhanashree Solar & RK and Sons items
UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "Dhanashree Solar Energy Solution",
            "address": "MIDC Area, Thane, Maharashtra, India",
            "scope": "Solar RO water purifiers, solar-powered freezers, solar heat pump dryers, solar-powered marine and submersible pumps, solar cold storage units, and solar water chillers",
            "phone": "+91 7972499093",
            "email": "response@dhanashreesolar.net",
            "validity": "Active (Empanelled Green Energy Vendor by NFDB)",
            "is_government_backed": true
        },
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Submersible_pump.jpg/640px-Submersible_pump.jpg'
WHERE name = '2HP Submersible Water Pump';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "Dhanashree Solar Energy Solution",
            "address": "MIDC Area, Thane, Maharashtra, India",
            "scope": "Solar RO water purifiers, solar-powered freezers, solar heat pump dryers, solar-powered marine and submersible pumps, solar cold storage units, and solar water chillers",
            "phone": "+91 7972499093",
            "email": "response@dhanashreesolar.net",
            "validity": "Active (Empanelled Green Energy Vendor by NFDB)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Auto_fish_feeder.jpg/640px-Auto_fish_feeder.jpg'
WHERE name = 'Automatic Solar Fish Feeder';

-- Update RK and Sons items
UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Aerator_in_fish_pond%2C_Thailand.jpg/640px-Aerator_in_fish_pond%2C_Thailand.jpg'
WHERE name = '1HP Paddle Wheel Aerator (2-wheel)';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Paddlewheel_aerator_in_aquaculture.jpg/640px-Paddlewheel_aerator_in_aquaculture.jpg'
WHERE name = '2HP Paddle Wheel Aerator (4-wheel)';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Venturi_nozzle.jpg/640px-Venturi_nozzle.jpg'
WHERE name = 'Venturi Aeration System (0.5 HP)';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = NULL
WHERE name = 'Trickling Bio-filter / Nitrifying Bioreactor (RAS)';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Centrifugal_water_pump.jpg/640px-Centrifugal_water_pump.jpg'
WHERE name = '0.5 HP Centrifugal Water Pump (RAS)';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Centrifugal_Pump.jpg/640px-Centrifugal_Pump.jpg'
WHERE name = '1HP RAS Pump';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = NULL
WHERE name = 'PVC Pipes, Valves and Fittings (RAS Plumbing)';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "RK and Sons",
            "address": "Head Office: Chhattisgarh, India (Serving Pan-India)",
            "scope": "Floating Venturi systems, paddle wheel aerators, Biofloc/RAS tanks, water pumps, HDPE pipes, and certified seeds",
            "phone": "+91 99813 13066",
            "email": "info@rkandsons.co.in",
            "validity": "Active (Serving 25+ states)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = NULL
WHERE name = 'PVC Pipes and Fittings (Biofloc)';

-- Update Jamshedpur Resources (Duraplast) items
UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "Jamshedpur Resources Private Limited (JRPL / Duraplast)",
            "address": "Jamshedpur - 831002, Jharkhand, India",
            "scope": "HDPE fish cages for inland cage culture, modular HDPE floating pontoons, floating jetties, and walkways under Blue Revolution/PMMSY",
            "phone": "+91 8047641967",
            "email": "ceo@duraplast.org.in",
            "validity": "Active (CIPET-tested, NSIC-certified, empanelled with NFDB)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = NULL
WHERE name = 'Floating Cage for RAS Tank (30 m³)';

UPDATE equipment_catalog SET
    supplier_info = '[
        {
            "name": "Jamshedpur Resources Private Limited (JRPL / Duraplast)",
            "address": "Jamshedpur - 831002, Jharkhand, India",
            "scope": "HDPE fish cages for inland cage culture, modular HDPE floating pontoons, floating jetties, and walkways under Blue Revolution/PMMSY",
            "phone": "+91 8047641967",
            "email": "ceo@duraplast.org.in",
            "validity": "Active (CIPET-tested, NSIC-certified, empanelled with NFDB)",
            "is_government_backed": true
        }
    ]'::jsonb,
    image_url = NULL
WHERE name = 'HDPE Floats for RAS Cage';

-- Update remaining items with audited high-quality public domain images
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Aquarium_air_pump.jpg/640px-Aquarium_air_pump.jpg' WHERE name = '18W Electromagnetic Aerator';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Blower.jpg/640px-Blower.jpg' WHERE name = '550W Vortex Blower';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Side_channel_blower_regenerative_blower.jpg/640px-Side_channel_blower_regenerative_blower.jpg' WHERE name = 'Air Blower (0.5 HP) for Biofloc';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Air_stone.jpg/640px-Air_stone.jpg' WHERE name = 'Air Stones for Biofloc Tank (Set of 10)';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/GeneratorSindh.jpg/640px-GeneratorSindh.jpg' WHERE name = '5kVA Silent Diesel Generator';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/YSI_multiparameter_water_quality_sonde.jpg/640px-YSI_multiparameter_water_quality_sonde.jpg' WHERE name = 'Handheld Multiparameter Water Meter';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Dissolved_oxygen_meter.jpg/640px-Dissolved_oxygen_meter.jpg' WHERE name = 'Digital Dissolved Oxygen (DO) Meter';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Water_testing_kit.jpg/640px-Water_testing_kit.jpg' WHERE name = 'Water Quality Test Kit';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Seine_hauling_net_1.jpg/640px-Seine_hauling_net_1.jpg' WHERE name = 'Pond Seining Net (100m x 3m)';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Cast_net.jpg/640px-Cast_net.jpg' WHERE name = 'Cast Net (12ft)';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Plastic_crate.jpg/640px-Plastic_crate.jpg' WHERE name = 'Fingerling Transport Crate (50L)';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/UV-lamp.jpg/640px-UV-lamp.jpg' WHERE name = '40W UV Sterilizer';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Lab_thermometer.jpg/640px-Lab_thermometer.jpg' WHERE name = 'Thermometer (Biofloc Water)';
UPDATE equipment_catalog SET image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Imhoff_cone.jpg/640px-Imhoff_cone.jpg' WHERE name = 'Imhoff Cone (Floc Volume Measurement)';

-- Set remaining unphotographed items to NULL to trigger clean vector fallback icons
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Iron Mesh Frame for Biofloc Tank';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Oxygen / Air Distribution Pipes';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Inverter for 24/7 Aeration Backup';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Battery for Inverter (Biofloc)';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Ammonia Test Kit (Biofloc)';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Nitrite Test Kit (Biofloc)';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Nitrate Test Kit (Biofloc)';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'pH Test Kit (Biofloc)';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Alkalinity Test Kit (Biofloc)';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Dissolved Oxygen (DO) Test Kit (Biofloc)';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Liquid Probiotics for Biofloc';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Calcium Carbonate (CaCO3) for Biofloc';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Molasses (Carbon Source for Biofloc)';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Raw Salt for Biofloc Water Preparation';
UPDATE equipment_catalog SET image_url = NULL WHERE name = 'Hand Net for Biofloc Tank';

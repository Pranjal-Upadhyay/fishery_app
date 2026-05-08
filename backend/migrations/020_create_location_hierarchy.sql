-- Migration 020: Create location hierarchy tables for Bihar cascade picker
-- Creates district, block, and panchayat tables with proper indexes

CREATE TABLE IF NOT EXISTS loc_districts (
  district_code VARCHAR(24) PRIMARY KEY,
  district_name VARCHAR(100) NOT NULL,
  state_code VARCHAR(2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loc_blocks (
  block_code VARCHAR(80) PRIMARY KEY,
  block_name VARCHAR(100) NOT NULL,
  district_code VARCHAR(24) NOT NULL REFERENCES loc_districts(district_code),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loc_panchayats (
  panchayat_code VARCHAR(80) PRIMARY KEY,
  panchayat_name VARCHAR(100) NOT NULL,
  block_code VARCHAR(80) NOT NULL REFERENCES loc_blocks(block_code),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_districts_state ON loc_districts(state_code);
CREATE INDEX IF NOT EXISTS idx_loc_blocks_district ON loc_blocks(district_code);
CREATE INDEX IF NOT EXISTS idx_loc_panchayats_block ON loc_panchayats(block_code);

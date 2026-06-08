-- Migration 046: Hatchery Coordinates
-- Add latitude and longitude columns to the hatcheries table.
ALTER TABLE hatcheries ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE hatcheries ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

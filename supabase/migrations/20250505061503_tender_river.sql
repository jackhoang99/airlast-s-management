/*
  # Update locations and units schema for single location

  1. Changes
    - Clear existing data
    - Update locations table structure
    - Update units table structure
    - Insert single location with units
  2. Security
    - Maintain existing RLS policies
*/

-- Clear existing data
TRUNCATE TABLE units CASCADE;
TRUNCATE TABLE locations CASCADE;

-- Update locations table
ALTER TABLE locations 
DROP COLUMN IF EXISTS building_name,
ADD COLUMN IF NOT EXISTS building_name text NOT NULL DEFAULT 'Fayetteville Pavillion';

-- Insert single location
INSERT INTO locations (
  name,
  building_name,
  address,
  city,
  state,
  zip,
  status,
  company_id
) VALUES (
  'Fayetteville Pavillion',
  'Fayetteville Pavillion',
  '72 Pavilion Parkway',
  'Fayetteville',
  'GA',
  '30214',
  'Active',
  (SELECT id FROM companies WHERE name = '5Rivers' LIMIT 1)
) RETURNING id;

-- Insert units for the location
WITH location_id AS (
  SELECT id FROM locations WHERE name = 'Fayetteville Pavillion' LIMIT 1
)
INSERT INTO units (location_id, unit_number, status)
VALUES
  ((SELECT id FROM location_id), 'Suite 128B', 'Active'),
  ((SELECT id FROM location_id), 'Suite 127', 'Active'),
  ((SELECT id FROM location_id), 'Suite 405', 'Active'),
  ((SELECT id FROM location_id), 'Suite 400', 'Active'),
  ((SELECT id FROM location_id), 'Suite 123', 'Active'),
  ((SELECT id FROM location_id), 'Suite 128A', 'Active'),
  ((SELECT id FROM location_id), 'Suite 96B', 'Active'),
  ((SELECT id FROM location_id), 'Suite 240', 'Active'),
  ((SELECT id FROM location_id), 'Suite 1360D', 'Active'),
  ((SELECT id FROM location_id), 'Suite ii-13', 'Active');
/*
  # Create units table and update locations schema
  
  1. New Tables
    - `units`
      - `id` (uuid, primary key)
      - `location_id` (uuid, foreign key to locations)
      - `unit_number` (text)
      - `status` (text)
      - `created_at` (timestamptz)
  
  2. Changes to locations table
    - Remove unit-specific fields
    - Add building_name field
  
  3. Security
    - Enable RLS on units table
    - Add policies for authenticated users to manage units
    - Add policies for public users to read units
*/

-- First modify the locations table
ALTER TABLE locations
ADD COLUMN building_name text;

-- Create the units table
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  UNIQUE(location_id, unit_number)
);

-- Enable RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Create policies for units table
CREATE POLICY "Enable read access for all users"
  ON units
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON units
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON units
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only"
  ON units
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS units_location_id_idx ON units(location_id);

-- Migrate existing data
WITH location_parts AS (
  SELECT 
    id,
    CASE 
      WHEN name ~ 'Suite' THEN split_part(name, 'Suite', 1)
      WHEN name ~ 'Unit' THEN split_part(name, 'Unit', 1)
      ELSE name
    END as building_name,
    CASE 
      WHEN name ~ 'Suite' THEN 'Suite ' || trim(split_part(name, 'Suite', 2))
      WHEN name ~ 'Unit' THEN 'Unit ' || trim(split_part(name, 'Unit', 2))
      ELSE NULL
    END as unit_number
  FROM locations
)
UPDATE locations l
SET building_name = lp.building_name
FROM location_parts lp
WHERE l.id = lp.id;

-- Insert units from existing location names
INSERT INTO units (location_id, unit_number, status)
SELECT 
  l.id,
  CASE 
    WHEN l.name ~ 'Suite' THEN 'Suite ' || trim(split_part(l.name, 'Suite', 2))
    WHEN l.name ~ 'Unit' THEN 'Unit ' || trim(split_part(l.name, 'Unit', 2))
    ELSE 'Main'
  END,
  l.status
FROM locations l
WHERE l.name ~ 'Suite' OR l.name ~ 'Unit';
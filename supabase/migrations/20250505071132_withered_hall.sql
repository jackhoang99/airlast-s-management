/*
  # Update RLS policies for all tables
  
  1. Changes
    - Drop existing policies for all tables
    - Create new policies for companies, locations, and units
    - Enable RLS on all tables
  2. Security
    - Allow public read access
    - Allow authenticated users full CRUD access
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop companies policies
  DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON companies;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON companies;
  DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON companies;
  
  -- Drop locations policies
  DROP POLICY IF EXISTS "Enable read access for all users" ON locations;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON locations;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON locations;
  DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON locations;
  
  -- Drop units policies
  DROP POLICY IF EXISTS "Enable read access for all users" ON units;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON units;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON units;
  DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON units;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Enable read access for all users"
  ON companies
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only"
  ON companies
  FOR DELETE
  TO authenticated
  USING (true);

-- Locations policies
CREATE POLICY "Enable read access for all users"
  ON locations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON locations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON locations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only"
  ON locations
  FOR DELETE
  TO authenticated
  USING (true);

-- Units policies
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
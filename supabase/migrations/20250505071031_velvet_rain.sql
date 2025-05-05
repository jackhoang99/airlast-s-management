/*
  # Update RLS policies for locations table

  1. Changes
    - Drop existing policies to avoid conflicts
    - Recreate policies for locations table
  2. Security
    - Enable RLS
    - Allow authenticated users to manage locations
    - Allow public read access
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON locations;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON locations;
  DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON locations;
  DROP POLICY IF EXISTS "Enable read access for all users" ON locations;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create new policies
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

CREATE POLICY "Enable read access for all users"
  ON locations
  FOR SELECT
  TO public
  USING (true);
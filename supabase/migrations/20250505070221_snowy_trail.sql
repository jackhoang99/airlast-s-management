/*
  # Fix locations table RLS policies

  1. Changes
    - Drop existing policies
    - Create new policies for authenticated users
    - Enable RLS on locations table
  2. Security
    - Allow authenticated users to manage locations
    - Maintain data security while allowing proper access
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable read access for all users" ON locations;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON locations;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON locations;
  DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON locations;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create new policies
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
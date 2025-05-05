/*
  # Fix RLS policies for units table

  1. Changes
    - Drop existing RLS policies
    - Create new policies that properly allow authenticated users to manage units
  2. Security
    - Allow public read access
    - Allow authenticated users to perform all operations
*/

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable read access for all users" ON units;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON units;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON units;
  DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON units;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies
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
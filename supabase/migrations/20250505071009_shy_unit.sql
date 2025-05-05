/*
  # Add RLS policies for locations table

  1. Security Changes
    - Add policy for authenticated users to insert locations
    - Add policy for authenticated users to update locations
    - Add policy for authenticated users to delete locations
    - Add policy for public users to read locations

  Note: These policies allow authenticated users to manage locations while maintaining public read access
*/

-- Enable RLS on locations table (if not already enabled)
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert locations
CREATE POLICY "Enable insert for authenticated users only"
ON locations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update locations
CREATE POLICY "Enable update for authenticated users only"
ON locations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete locations
CREATE POLICY "Enable delete for authenticated users only"
ON locations
FOR DELETE
TO authenticated
USING (true);

-- Allow public read access to locations
CREATE POLICY "Enable read access for all users"
ON locations
FOR SELECT
TO public
USING (true);
/*
  # Fix Units Table RLS Policies

  1. Changes
    - Drop existing RLS policies for units table that are causing issues
    - Create new RLS policies with proper conditions for:
      - INSERT: Allow authenticated users to insert units
      - SELECT: Allow public read access
      - UPDATE: Allow authenticated users to update units
      - DELETE: Allow authenticated users to delete units
  
  2. Security
    - Maintains RLS enabled on units table
    - Ensures proper access control for CRUD operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON units;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON units;
DROP POLICY IF EXISTS "Enable read access for all users" ON units;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON units;

-- Create new policies with proper conditions
CREATE POLICY "Enable read access for all users"
ON public.units
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for authenticated users only"
ON public.units
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
ON public.units
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only"
ON public.units
FOR DELETE
TO authenticated
USING (true);
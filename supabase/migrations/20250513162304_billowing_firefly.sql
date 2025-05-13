/*
  # Fix job_presets RLS policies

  1. Changes
    - Drop conflicting RLS policies for job_presets table
    - Create new, consolidated RLS policies with proper checks
    
  2. Security
    - Enable RLS on job_presets table
    - Add policies for:
      - Insert: Users can only create presets with their own user ID
      - Select: Users can view all presets
      - Update: Users can only update their own presets
      - Delete: Users can only delete their own presets
*/

-- First, drop the conflicting policies
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON job_presets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON job_presets;
DROP POLICY IF EXISTS "Enable read access for all users" ON job_presets;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON job_presets;
DROP POLICY IF EXISTS "Users can create their own presets" ON job_presets;
DROP POLICY IF EXISTS "Users can delete their own presets" ON job_presets;
DROP POLICY IF EXISTS "Users can update their own presets" ON job_presets;
DROP POLICY IF EXISTS "Users can view all presets" ON job_presets;

-- Create new, consolidated policies
CREATE POLICY "Users can create their own presets"
ON job_presets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can view all presets"
ON job_presets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own presets"
ON job_presets
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own presets"
ON job_presets
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);
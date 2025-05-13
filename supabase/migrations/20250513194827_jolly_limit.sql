/*
  # Update job_presets table RLS policies

  1. Changes
    - Enable RLS on job_presets table
    - Add policies for CRUD operations
    - Each user can only manage their own presets
    - All authenticated users can view all presets
*/

-- Enable RLS
ALTER TABLE job_presets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can create own presets" ON job_presets;
DROP POLICY IF EXISTS "Users can update own presets" ON job_presets;
DROP POLICY IF EXISTS "Users can delete own presets" ON job_presets;
DROP POLICY IF EXISTS "Users can view all presets" ON job_presets;

-- Create new policies
CREATE POLICY "Users can create own presets"
ON job_presets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets"
ON job_presets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
ON job_presets
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all presets"
ON job_presets
FOR SELECT
TO authenticated
USING (true);
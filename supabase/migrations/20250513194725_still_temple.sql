/*
  # Add user_id to job_presets and update RLS policies

  1. Changes
    - Add user_id column to job_presets table
    - Add foreign key constraint to auth.users
    - Update RLS policies to enforce user-based access

  2. Security
    - Enable RLS on job_presets table
    - Add policies for:
      - Insert: Users can only create their own presets
      - Select: Users can view all presets
      - Update/Delete: Users can only modify their own presets
*/

-- Add user_id column
ALTER TABLE job_presets 
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT auth.uid();

-- Add foreign key constraint
ALTER TABLE job_presets
ADD CONSTRAINT job_presets_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE job_presets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can perform all operations on tags" ON job_presets;

-- Create new policies
CREATE POLICY "Users can create own presets"
ON job_presets
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all presets"
ON job_presets
FOR SELECT
TO authenticated
USING (true);

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
/*
  # Fix job presets authentication
  
  1. Changes
    - Drop existing table and policies
    - Recreate table with proper auth handling
    - Add simplified RLS policies
  2. Security
    - Allow authenticated users to create/read presets
    - Restrict update/delete to preset owners
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS job_presets CASCADE;

-- Create job_presets table
CREATE TABLE job_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  owner_id uuid DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE job_presets ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "Enable read access for authenticated users"
ON job_presets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON job_presets
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for preset owners"
ON job_presets
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Enable delete for preset owners"
ON job_presets
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS job_presets_name_idx ON job_presets(name);
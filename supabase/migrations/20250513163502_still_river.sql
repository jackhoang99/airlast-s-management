-- Drop existing table and policies
DROP TABLE IF EXISTS job_presets CASCADE;

-- Create job_presets table with simplified structure
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
CREATE POLICY "Enable all access for authenticated users"
ON job_presets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS job_presets_name_idx ON job_presets(name);
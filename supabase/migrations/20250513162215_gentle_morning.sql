-- Create job_presets table
CREATE TABLE IF NOT EXISTS job_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  owner_id uuid DEFAULT auth.uid() NOT NULL
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_job_presets_updated_at ON job_presets;
CREATE TRIGGER update_job_presets_updated_at
  BEFORE UPDATE ON job_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE job_presets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all presets" ON job_presets;
DROP POLICY IF EXISTS "Users can create their own presets" ON job_presets;
DROP POLICY IF EXISTS "Users can update their own presets" ON job_presets;
DROP POLICY IF EXISTS "Users can delete their own presets" ON job_presets;

-- Create policies
CREATE POLICY "Users can view all presets"
  ON job_presets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own presets"
  ON job_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS job_presets_name_idx ON job_presets(name);
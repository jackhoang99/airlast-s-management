/*
  # Add RLS policies for job_presets table

  1. Security Changes
    - Enable RLS on job_presets table
    - Add policies for CRUD operations:
      - Allow authenticated users to create presets
      - Allow authenticated users to read all presets
      - Allow authenticated users to update their own presets
      - Allow authenticated users to delete their own presets
    
  2. Schema Updates
    - Add owner_id column to track preset ownership
*/

-- Enable RLS
ALTER TABLE job_presets ENABLE ROW LEVEL SECURITY;

-- Add owner_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_presets' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE job_presets ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Set owner_id as not null for new rows
ALTER TABLE job_presets ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE job_presets ALTER COLUMN owner_id SET NOT NULL;

-- Create policies
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
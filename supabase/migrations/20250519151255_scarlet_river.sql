/*
  # Fix job-technician relationship
  
  1. Changes
    - Migrate existing technician_id data to job_technicians table
    - Add job_technicians junction table if it doesn't exist
    - Create indexes and constraints for better performance
  2. Data Integrity
    - Preserves existing technician assignments
    - Maintains referential integrity
*/

-- Create job_technicians table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES users(id),
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, technician_id)
);

-- Enable RLS
ALTER TABLE job_technicians ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'job_technicians' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users"
      ON job_technicians
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS job_technicians_job_id_idx ON job_technicians(job_id);
CREATE INDEX IF NOT EXISTS job_technicians_technician_id_idx ON job_technicians(technician_id);

-- Migrate existing technician_id data to job_technicians table
INSERT INTO job_technicians (job_id, technician_id, is_primary)
SELECT 
  id as job_id, 
  technician_id, 
  true as is_primary
FROM jobs
WHERE 
  technician_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM job_technicians 
    WHERE job_technicians.job_id = jobs.id AND job_technicians.technician_id = jobs.technician_id
  );
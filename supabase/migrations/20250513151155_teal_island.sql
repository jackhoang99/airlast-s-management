/*
  # Add job number display and generation
  
  1. Changes
    - Add job number column if not exists
    - Create sequence for job numbers
    - Create trigger for auto-generating numbers
    - Update existing jobs with numbers
  2. Notes
    - Numbers will be displayed as 4-digit padded values
    - Auto-increments for each new job
*/

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS job_number_seq START 1;

-- Create function to generate job number
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Get next value from sequence and pad with zeros
  NEW.number := LPAD(nextval('job_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate job number
DROP TRIGGER IF EXISTS set_job_number ON jobs;
CREATE TRIGGER set_job_number
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION generate_job_number();

-- Update any existing jobs without numbers
UPDATE jobs 
SET number = LPAD(nextval('job_number_seq')::text, 4, '0')
WHERE number IS NULL OR number = '';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS jobs_number_idx ON jobs(number);

-- Add unique constraint if not exists
DO $$ 
BEGIN
  ALTER TABLE jobs ADD CONSTRAINT jobs_number_key UNIQUE (number);
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;
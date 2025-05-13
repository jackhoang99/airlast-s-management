/*
  # Add job number sequence and trigger
  
  1. Changes
    - Create sequence for job numbers
    - Add trigger to automatically generate job numbers
    - Update existing jobs with numbers
  2. Notes
    - Numbers will be padded to 4 digits (e.g., 0001)
    - Sequence starts at 1
*/

-- Create sequence for job numbers
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
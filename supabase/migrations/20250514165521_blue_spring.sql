/*
  # Add unit_id to jobs table
  
  1. Changes
    - Add unit_id column to jobs table
    - Add foreign key constraint to units table
    - Create index for better performance
  2. Notes
    - Allows jobs to be associated with specific units
    - Maintains referential integrity with units table
*/

-- Add unit_id column to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES units(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS jobs_unit_id_idx ON jobs(unit_id);
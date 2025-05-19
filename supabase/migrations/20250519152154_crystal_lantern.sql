/*
  # Remove technician_id from jobs table
  
  1. Changes
    - Remove technician_id column from jobs table
    - Ensure all technician assignments are in job_technicians table
    - Update constraints and references
  2. Notes
    - Creates cleaner many-to-many relationship
    - All technician details now come from job_technicians table
*/

-- First ensure all technician assignments are in job_technicians table
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

-- Drop foreign key constraint if it exists
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_technician_id_fkey;

-- Drop index if it exists
DROP INDEX IF EXISTS jobs_technician_id_idx;

-- Remove technician_id column
ALTER TABLE jobs DROP COLUMN IF EXISTS technician_id;
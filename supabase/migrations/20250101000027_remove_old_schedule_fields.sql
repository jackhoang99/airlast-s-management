-- Remove old schedule fields from jobs table
-- These are no longer needed since we use individual technician scheduling

ALTER TABLE jobs 
DROP COLUMN IF EXISTS schedule_start,
DROP COLUMN IF EXISTS schedule_time,
DROP COLUMN IF EXISTS schedule_duration;

-- Add comment to document the change
COMMENT ON TABLE jobs IS 'Jobs table - scheduling now handled via job_technicians.schedule_date and job_technicians.schedule_time'; 
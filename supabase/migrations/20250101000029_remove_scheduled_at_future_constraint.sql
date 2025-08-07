-- Remove the check constraint that requires scheduled_at to be in the future
-- This constraint is causing issues when assigning technicians to jobs
ALTER TABLE job_technicians 
DROP CONSTRAINT IF EXISTS check_scheduled_at_future; 
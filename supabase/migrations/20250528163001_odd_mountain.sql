-- Add repair_approved column to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS repair_approved boolean DEFAULT null;

-- This column will store whether the customer approved or denied the repair
-- null = not yet decided
-- true = approved
-- false = denied

-- Add completed column to job_inspections if it doesn't exist
ALTER TABLE job_inspections
ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;
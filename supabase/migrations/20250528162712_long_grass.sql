-- Add repair_approved column to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS repair_approved boolean DEFAULT null;

-- This column will store whether the customer approved or denied the repair
-- null = not yet decided
-- true = approved
-- false = denied
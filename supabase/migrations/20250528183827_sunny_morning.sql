-- This migration fixes the issue with the job_replacements_selected_phase_check constraint
-- by properly checking if it exists before trying to add it

-- First, drop the constraint if it exists to avoid conflicts
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'job_replacements_selected_phase_check'
  ) THEN
    ALTER TABLE job_replacements 
    DROP CONSTRAINT job_replacements_selected_phase_check;
  END IF;
END $$;

-- Now add the column if it doesn't exist
ALTER TABLE job_replacements 
ADD COLUMN IF NOT EXISTS selected_phase text;

-- Add the constraint
ALTER TABLE job_replacements 
ADD CONSTRAINT job_replacements_selected_phase_check 
CHECK (selected_phase IN ('phase1', 'phase2', 'phase3'));

-- Add total_cost column if it doesn't exist
ALTER TABLE job_replacements 
ADD COLUMN IF NOT EXISTS total_cost numeric(10,2);

-- Add comment to explain the columns
COMMENT ON COLUMN job_replacements.selected_phase IS 'Stores which phase option is currently selected (phase1, phase2, or phase3)';
COMMENT ON COLUMN job_replacements.total_cost IS 'Stores the calculated total cost including margin';
-- Check if selected_phase constraint exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'job_replacements_selected_phase_check'
  ) THEN
    -- Add selected_phase column with check constraint
    ALTER TABLE job_replacements 
    ADD COLUMN IF NOT EXISTS selected_phase text,
    ADD CONSTRAINT job_replacements_selected_phase_check 
    CHECK (selected_phase IN ('phase1', 'phase2', 'phase3'));
  ELSE
    -- Just add the column if it doesn't exist (constraint already exists)
    ALTER TABLE job_replacements 
    ADD COLUMN IF NOT EXISTS selected_phase text;
  END IF;
END $$;

-- Add total_cost column if it doesn't exist
ALTER TABLE job_replacements 
ADD COLUMN IF NOT EXISTS total_cost numeric(10,2);

-- Add comment to explain the columns
COMMENT ON COLUMN job_replacements.selected_phase IS 'Stores which phase option is currently selected (phase1, phase2, or phase3)';
COMMENT ON COLUMN job_replacements.total_cost IS 'Stores the calculated total cost including margin';
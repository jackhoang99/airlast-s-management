-- Check if the constraint exists before trying to add it
DO $$ 
BEGIN
  -- First check if the column exists but the constraint doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_replacements' AND column_name = 'selected_phase'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'job_replacements_selected_phase_check'
  ) THEN
    -- Add the constraint only if the column exists but constraint doesn't
    ALTER TABLE job_replacements 
    ADD CONSTRAINT job_replacements_selected_phase_check 
    CHECK (selected_phase IN ('phase1', 'phase2', 'phase3'));
  END IF;
  
  -- Make sure the column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_replacements' AND column_name = 'selected_phase'
  ) THEN
    ALTER TABLE job_replacements 
    ADD COLUMN selected_phase text;
  END IF;
  
  -- Make sure the total_cost column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_replacements' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE job_replacements 
    ADD COLUMN total_cost numeric(10,2);
  END IF;
END $$;
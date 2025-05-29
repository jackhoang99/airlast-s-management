/*
  # Add selected phase and total cost columns to job_replacements table

  1. Changes
    - Add `selected_phase` column to store which phase option is selected (phase1, phase2, phase3)
    - Add `total_cost` column to store the calculated total cost with margin
    
  2. Notes
    - Both columns are nullable since they may not be set immediately
    - selected_phase is constrained to only allow valid phase values
*/

-- Add selected_phase column with check constraint
ALTER TABLE job_replacements 
ADD COLUMN IF NOT EXISTS selected_phase text,
ADD CONSTRAINT job_replacements_selected_phase_check 
CHECK (selected_phase IN ('phase1', 'phase2', 'phase3'));

-- Add total_cost column
ALTER TABLE job_replacements 
ADD COLUMN IF NOT EXISTS total_cost numeric(10,2);

-- Add comment to explain the columns
COMMENT ON COLUMN job_replacements.selected_phase IS 'Stores which phase option is currently selected (phase1, phase2, or phase3)';
COMMENT ON COLUMN job_replacements.total_cost IS 'Stores the calculated total cost including margin';
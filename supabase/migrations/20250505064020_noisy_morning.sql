/*
  # Remove status columns from companies and locations

  1. Changes
    - Remove status column from companies table
    - Remove status column from locations table
    - Keep status only at the unit level
  2. Notes
    - Status tracking is now only at the unit level
    - Existing status constraints are removed
*/

-- Remove status column from companies
ALTER TABLE companies DROP COLUMN IF EXISTS status;

-- Remove status column from locations
ALTER TABLE locations DROP COLUMN IF EXISTS status;

-- Ensure units table has correct status column
ALTER TABLE units 
  ALTER COLUMN status SET DEFAULT 'Active',
  ALTER COLUMN status SET NOT NULL;

-- Add check constraint to ensure valid status values
ALTER TABLE units
  DROP CONSTRAINT IF EXISTS units_status_check,
  ADD CONSTRAINT units_status_check 
  CHECK (status IN ('Active', 'Inactive'));

-- Update any NULL status values to 'Active'
UPDATE units SET status = 'Active' WHERE status IS NULL;
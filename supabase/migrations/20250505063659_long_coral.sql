/*
  # Remove status from locations table
  
  1. Changes
    - Remove status column from locations table
    - Add NOT NULL constraint to units.status
    - Add check constraint to ensure valid status values
    - Update existing data
  2. Notes
    - Status is now only tracked at the unit level
    - Valid status values are 'Active' and 'Inactive'
*/

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
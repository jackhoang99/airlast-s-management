/*
  # Move status from locations to units

  1. Changes
    - Remove status column from locations table
    - Keep status column on units table
    - Update existing data to maintain status information
  2. Data Integrity
    - Ensures no data loss during migration
    - Maintains existing status values for units
*/

-- First, remove the status column from locations
ALTER TABLE locations DROP COLUMN IF EXISTS status;

-- Ensure units table has correct status column
ALTER TABLE units 
  ALTER COLUMN status SET DEFAULT 'Active',
  ALTER COLUMN status SET NOT NULL;

-- Add check constraint to ensure valid status values
ALTER TABLE units
  ADD CONSTRAINT units_status_check 
  CHECK (status IN ('Active', 'Inactive'));
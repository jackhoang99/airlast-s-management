/*
  # Remove status indicators from companies and locations

  1. Changes
    - Remove status column from companies table
    - Update related code to remove status references
  2. Notes
    - Status is now only tracked at the unit level
    - Preserves existing data
*/

-- Remove status column from companies
ALTER TABLE companies DROP COLUMN IF EXISTS status;

-- Remove any status-related constraints
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_status_check;
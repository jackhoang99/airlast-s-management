-- Add new columns to units table for contact information
ALTER TABLE units
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS primary_contact text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text;

-- Update status values to lowercase
UPDATE units
SET status = LOWER(status)
WHERE status IS NOT NULL;

-- Make sure the status check constraint uses lowercase values
ALTER TABLE units
DROP CONSTRAINT IF EXISTS units_status_check;

ALTER TABLE units
ADD CONSTRAINT units_status_check 
CHECK (status IN ('active', 'inactive'));
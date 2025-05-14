/*
  # Update jobs table with additional fields
  
  1. Changes
    - Add contact information fields
    - Add service details fields
    - Add contract and office fields
    - Add schedule fields
  2. Notes
    - Maintains existing data
    - Adds all fields from create job form
*/

-- Add new columns to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_type text,
ADD COLUMN IF NOT EXISTS service_line text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS problem_description text,
ADD COLUMN IF NOT EXISTS customer_po text,
ADD COLUMN IF NOT EXISTS service_contract text DEFAULT 'Standard',
ADD COLUMN IF NOT EXISTS office text DEFAULT 'Main Office',
ADD COLUMN IF NOT EXISTS schedule_date date,
ADD COLUMN IF NOT EXISTS schedule_time time,
ADD COLUMN IF NOT EXISTS schedule_duration interval,
ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES users(id);

-- Create index for technician lookup
CREATE INDEX IF NOT EXISTS jobs_technician_id_idx ON jobs(technician_id);

-- Add constraint for contact type
ALTER TABLE jobs
ADD CONSTRAINT jobs_contact_type_check 
CHECK (contact_type IN ('primary', 'secondary', 'emergency'));

-- Add constraint for service line
ALTER TABLE jobs
ADD CONSTRAINT jobs_service_line_check 
CHECK (service_line IN (
  SELECT code FROM service_lines
));
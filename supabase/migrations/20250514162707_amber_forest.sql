/*
  # Add job fields and constraints
  
  1. Changes
    - Add new columns to jobs table for contact info, service details, and scheduling
    - Add constraints for contact_type and service_line
    - Create index for technician lookup
  2. Data Structure
    - Contact fields: email, type
    - Service fields: line, description, problem description
    - Customer fields: PO, service contract
    - Schedule fields: date, time, duration
    - Assignment: technician_id
*/

-- Check if contact_type_check constraint exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_contact_type_check'
  ) THEN
    ALTER TABLE jobs
    ADD CONSTRAINT jobs_contact_type_check 
    CHECK (contact_type IN ('primary', 'secondary', 'emergency'));
  END IF;
END $$;

-- Check if service_line_check constraint exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_service_line_check'
  ) THEN
    ALTER TABLE jobs
    ADD CONSTRAINT jobs_service_line_check 
    CHECK (service_line IN (
      'ACON', 'ACURT', 'ATU', 'CWATER', 'CHLLR', 'CFCTRL', 'CAIRH', 'CAIRQ', 
      'CCTRL', 'CCOOL', 'CDUCT', 'CHPMP', 'COMHEAT', 'COMP', 'CRAC', 'CRAH', 
      'CU', 'COOL', 'COOLING', 'COOLTWR', 'DCOOL', 'EHEAT', 'EQMAINT', 'EVACLR', 
      'FCU', 'FREEZE', 'FUELPMP', 'FURN', 'GEO', 'GEOTHERM', 'HEXCH', 'HRVERV', 
      'HEATNG', 'HUMID', 'HVACGEN', 'HVACR', 'ICEMA', 'ICRNK', 'MUAS', 'MOTOR', 
      'OFFC', 'OTHR', 'PAID', 'PCOOL', 'PIPING', 'PLAN', 'POOLDEHUM', 'PRTAB', 
      'PGR', 'RECOIL', 'RICOO', 'REFRG', 'RAIRH', 'RAIRQ', 'RCTRL', 'RCOOL', 
      'RDUCT', 'RHPMP', 'RHEAT', 'RTU', 'SAFT', 'SHOP', 'SICK', 'TESTBAL', 
      'THERM', 'TRNG', 'UHEAT', 'UNPAID', 'VMAINT', 'VENT', 'WICOO', 'WIFRE', 
      'WHLSLE'
    ));
  END IF;
END $$;

-- Add new columns to jobs table if they don't exist
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

-- Create index for technician lookup if it doesn't exist
CREATE INDEX IF NOT EXISTS jobs_technician_id_idx ON jobs(technician_id);
/*
  # Add new fields to jobs table
  
  1. Changes
    - Add contact_email, contact_type fields
    - Add service_line, description, problem_description fields
    - Add customer_po, service_contract fields
    - Add schedule_date, schedule_time, schedule_duration fields
    - Add technician_id field with reference to users table
  2. Security
    - Add constraints for contact_type
    - Add constraints for service_line using explicit list of values
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

-- Add constraint for service line using explicit list of values
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
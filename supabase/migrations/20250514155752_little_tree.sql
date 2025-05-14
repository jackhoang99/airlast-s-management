/*
  # Update jobs table with additional fields
  
  1. Changes
    - Add contact information fields
    - Add service details fields
    - Add scheduling fields
    - Add constraints and indexes
  2. Notes
    - Maintains existing data
    - Adds appropriate constraints
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
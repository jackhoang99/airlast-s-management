/*
  # Add users table and company settings
  
  1. New Tables
    - users: Store user information and permissions
  2. Changes
    - Add company settings to settings table
  3. Security
    - Enable RLS on users table
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id),
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  phone text,
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'active',
  services text[],
  office_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'technician', 'user')),
  CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive', 'suspended'))
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX users_auth_id_idx ON users(auth_id);
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_username_idx ON users(username);

-- Insert company settings
INSERT INTO settings (key, value, description) VALUES
  ('company', jsonb_build_object(
    'name', '(DEMO) Airlast Inc.',
    'physical_address', jsonb_build_object(
      'street', '1650 Marietta Boulevard Northwest',
      'city', 'Atlanta',
      'state', 'GA',
      'zip', '30318',
      'phone', '(404) 632-9074'
    ),
    'mailing_address', jsonb_build_object(
      'street', '1650 Marietta Boulevard Northwest',
      'city', 'Atlanta',
      'state', 'GA',
      'zip', '30318',
      'phone', '(404) 632-9074'
    ),
    'time_zone', 'America/New_York'
  ), 'Company information and settings'),
  
  ('offices', jsonb_build_array(
    jsonb_build_object(
      'name', 'Main Office',
      'address', '1650 Marietta Boulevard Northwest',
      'city', 'Atlanta',
      'state', 'GA',
      'zip', '30318',
      'service_lines', jsonb_build_array()
    )
  ), 'Company office locations');

-- Insert demo users
INSERT INTO users (username, email, first_name, last_name, role, services, status) VALUES
  ('airlast.demo', 'demo+airlast@stdemo.account.com', 'Airlast', 'Demo', 'admin', 
   ARRAY['ATME', 'CSCALL', 'EQMAINT', 'IT', 'OFFC', 'PAID', 'PLAN', 'PGR', 'SAFT', 'SHOP', 'SICK', 'TESTBAL', 'VACA', 'TRNG', 'UNPAID', 'VMAINT', 'WHLSLE', 'RES', 'OTHR', 'RTRNTRP', 'ACON', 'ACURT', 'ATU', 'CWATER', 'CHLLR', 'CFCTRL', 'CAIRH', 'CAIRQ', 'CCTRL', 'CCOOL', 'CDUCT', 'CHPMP', 'COMHEAT', 'COMP', 'CRAC', 'CRAH', 'CU', 'COOL', 'COOLING', 'COOLTWR', 'DCOOL', 'EHEAT', 'EVACLR', 'FCU', 'FREEZE', 'FUELPMP', 'FURN', 'GEO', 'HVAC', 'HVACR', 'HEXCH', 'HRVERV', 'HEATNG', 'HUMID', 'ICEMA', 'ICRNK', 'MUAS', 'MOTOR', 'PCOOL', 'PIPING', 'POOLDEHUM', 'PRTAB', 'RECOIL', 'RICOO', 'RIFRE', 'RTRUCK', 'REFRG', 'RAIRH', 'RAIRQ', 'RCTRL', 'RCOOL', 'RDUCT', 'RHPMP', 'RHEAT', 'RTU', 'THERM', 'UHEAT', 'VENT', 'WICOO', 'WIFRE'],
   'active'),
  ('airlast.demo.st', 'integrations+airlast@servicetrade.com', 'ServiceTrade', 'Support', 'admin', ARRAY[]::text[], 'active'),
  ('Airlast_tech1', 'john@demo.com', 'John', 'Tech', 'technician', ARRAY[]::text[], 'active');
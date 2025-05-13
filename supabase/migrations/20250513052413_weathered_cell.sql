/*
  # Create settings tables for service lines and job types
  
  1. New Tables
    - service_lines: Available service categories
    - job_types: Types of jobs/services offered
    - settings: General application settings
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create service_lines table
CREATE TABLE service_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create job_types table
CREATE TABLE job_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  description text,
  service_line_id uuid REFERENCES service_lines(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create settings table
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON service_lines
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON service_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON job_types
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON job_types
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON settings
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default service lines
INSERT INTO service_lines (name, code, description) VALUES
  ('HVAC', 'HVAC', 'Heating, Ventilation, and Air Conditioning services'),
  ('Plumbing', 'PLMB', 'Plumbing services and repairs'),
  ('Electrical', 'ELEC', 'Electrical services and installations'),
  ('Refrigeration', 'REFR', 'Commercial and industrial refrigeration'),
  ('Controls', 'CTRL', 'Building automation and control systems'),
  ('Preventative Maintenance', 'PM', 'Regular maintenance services');

-- Insert default job types
INSERT INTO job_types (name, code, description, service_line_id) VALUES
  ('Service Call', 'SVC', 'General service calls', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Emergency Service', 'EMRG', 'Emergency repairs and services', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Preventative Maintenance', 'PM', 'Scheduled maintenance visits', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Installation', 'INST', 'New equipment installation', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Repair', 'REP', 'Equipment repairs', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Inspection', 'INSP', 'System inspections', (SELECT id FROM service_lines WHERE code = 'HVAC')),
  ('Replacement', 'REPL', 'Equipment replacement', (SELECT id FROM service_lines WHERE code = 'HVAC'));

-- Create indexes
CREATE INDEX service_lines_code_idx ON service_lines(code);
CREATE INDEX job_types_code_idx ON job_types(code);
CREATE INDEX job_types_service_line_id_idx ON job_types(service_line_id);
/*
  # Create technicians schema
  
  1. New Tables
    - technicians: Core technician information
    - technician_skills: Skills and expertise tracking
    - technician_certifications: Professional certifications
    - technician_availability: Work schedule management
    - technician_territories: Service area assignments
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create technicians table
CREATE TABLE technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  hire_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  job_title text NOT NULL,
  hourly_rate decimal(10,2),
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT technicians_status_check CHECK (status IN ('active', 'inactive', 'on_leave'))
);

-- Create technician skills table
CREATE TABLE technician_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  proficiency_level text NOT NULL,
  years_experience integer,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT technician_skills_proficiency_check CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert'))
);

-- Create technician certifications table
CREATE TABLE technician_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  certification_name text NOT NULL,
  issuing_organization text NOT NULL,
  certification_number text,
  issue_date date NOT NULL,
  expiry_date date,
  status text NOT NULL DEFAULT 'active',
  document_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT technician_certifications_status_check CHECK (status IN ('active', 'expired', 'revoked'))
);

-- Create technician availability table
CREATE TABLE technician_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT technician_availability_day_check CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT technician_availability_time_check CHECK (start_time < end_time)
);

-- Create technician territories table
CREATE TABLE technician_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  territory_name text NOT NULL,
  state text NOT NULL,
  zip_codes text[] NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_territories ENABLE ROW LEVEL SECURITY;

-- Create policies for technicians
CREATE POLICY "Enable read access for all users" ON technicians
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON technicians
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for technician_skills
CREATE POLICY "Enable read access for all users" ON technician_skills
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON technician_skills
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for technician_certifications
CREATE POLICY "Enable read access for all users" ON technician_certifications
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON technician_certifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for technician_availability
CREATE POLICY "Enable read access for all users" ON technician_availability
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON technician_availability
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for technician_territories
CREATE POLICY "Enable read access for all users" ON technician_territories
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON technician_territories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX technicians_employee_id_idx ON technicians(employee_id);
CREATE INDEX technicians_email_idx ON technicians(email);
CREATE INDEX technician_skills_technician_id_idx ON technician_skills(technician_id);
CREATE INDEX technician_certifications_technician_id_idx ON technician_certifications(technician_id);
CREATE INDEX technician_availability_technician_id_idx ON technician_availability(technician_id);
CREATE INDEX technician_territories_technician_id_idx ON technician_territories(technician_id);
/*
  # Create jobs schema and related tables
  
  1. New Tables
    - `jobs`: Main job information
    - `job_appointments`: Scheduled appointments for jobs
    - `job_items`: Parts, labor, and items for jobs
    - `job_clock_events`: Time tracking events
    - `job_assets`: Assets associated with jobs
    - `job_deficiencies`: Issues found during jobs
    - `job_invoices`: Invoice records
    - `job_comments`: Comments on jobs
    - `job_attachments`: Files attached to jobs
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create jobs table
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'unscheduled',
  type text NOT NULL,
  owner_id uuid REFERENCES auth.users(id),
  contact_name text,
  contact_phone text,
  location_id uuid REFERENCES locations(id),
  contract_id uuid,
  contract_name text,
  office text,
  estimated_cost decimal(10,2),
  is_training boolean DEFAULT false,
  time_period_start date NOT NULL,
  time_period_due date NOT NULL,
  schedule_start timestamp with time zone,
  schedule_duration interval,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT jobs_status_check CHECK (status IN ('scheduled', 'unscheduled', 'completed', 'cancelled')),
  CONSTRAINT jobs_type_check CHECK (type IN ('preventative maintenance', 'service call'))
);

-- Create job appointments table
CREATE TABLE job_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  duration interval NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  technician_id uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_appointments_status_check CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- Create job items table
CREATE TABLE job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  service_line text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost decimal(10,2) NOT NULL,
  total_cost decimal(10,2) NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_items_type_check CHECK (type IN ('part', 'labor', 'item'))
);

-- Create job clock events table
CREATE TABLE job_clock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_time timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT job_clock_events_type_check CHECK (event_type IN ('clock_in', 'clock_out', 'break_start', 'break_end'))
);

-- Create job assets table
CREATE TABLE job_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

-- Create job deficiencies table
CREATE TABLE job_deficiencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_deficiencies_priority_check CHECK (priority IN ('low', 'medium', 'high')),
  CONSTRAINT job_deficiencies_status_check CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

-- Create job invoices table
CREATE TABLE job_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issued_date date,
  due_date date,
  paid_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_invoices_status_check CHECK (status IN ('draft', 'issued', 'paid', 'void'))
);

-- Create job comments table
CREATE TABLE job_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create job attachments table
CREATE TABLE job_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_clock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_deficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for jobs table
CREATE POLICY "Enable read access for all users" ON jobs
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for job_appointments table
CREATE POLICY "Enable read access for all users" ON job_appointments
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON job_appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for job_items table
CREATE POLICY "Enable read access for all users" ON job_items
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON job_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for job_clock_events table
CREATE POLICY "Enable read access for all users" ON job_clock_events
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON job_clock_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for job_assets table
CREATE POLICY "Enable read access for all users" ON job_assets
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON job_assets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for job_deficiencies table
CREATE POLICY "Enable read access for all users" ON job_deficiencies
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON job_deficiencies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for job_invoices table
CREATE POLICY "Enable read access for all users" ON job_invoices
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON job_invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for job_comments table
CREATE POLICY "Enable read access for all users" ON job_comments
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON job_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for job_attachments table
CREATE POLICY "Enable read access for all users" ON job_attachments
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable all access for authenticated users" ON job_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX jobs_number_idx ON jobs(number);
CREATE INDEX jobs_location_id_idx ON jobs(location_id);
CREATE INDEX jobs_owner_id_idx ON jobs(owner_id);
CREATE INDEX job_appointments_job_id_idx ON job_appointments(job_id);
CREATE INDEX job_appointments_technician_id_idx ON job_appointments(technician_id);
CREATE INDEX job_items_job_id_idx ON job_items(job_id);
CREATE INDEX job_clock_events_job_id_idx ON job_clock_events(job_id);
CREATE INDEX job_assets_job_id_idx ON job_assets(job_id);
CREATE INDEX job_deficiencies_job_id_idx ON job_deficiencies(job_id);
CREATE INDEX job_invoices_job_id_idx ON job_invoices(job_id);
CREATE INDEX job_comments_job_id_idx ON job_comments(job_id);
CREATE INDEX job_attachments_job_id_idx ON job_attachments(job_id);
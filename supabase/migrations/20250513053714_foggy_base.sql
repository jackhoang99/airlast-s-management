/*
  # Add technician information fields
  
  1. Changes
    - Add additional fields to technicians table
    - Add technician preferences table
    - Add technician notes table
  2. Security
    - Enable RLS on new tables
    - Add policies for admin access
*/

-- Add new fields to technicians table
ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip text,
ADD COLUMN IF NOT EXISTS license_number text,
ADD COLUMN IF NOT EXISTS license_expiry date,
ADD COLUMN IF NOT EXISTS vehicle_number text,
ADD COLUMN IF NOT EXISTS vehicle_make text,
ADD COLUMN IF NOT EXISTS vehicle_model text,
ADD COLUMN IF NOT EXISTS vehicle_year text,
ADD COLUMN IF NOT EXISTS shirt_size text,
ADD COLUMN IF NOT EXISTS boot_size text,
ADD COLUMN IF NOT EXISTS preferred_name text,
ADD COLUMN IF NOT EXISTS tax_id text,
ADD COLUMN IF NOT EXISTS direct_deposit boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_routing text,
ADD COLUMN IF NOT EXISTS bank_account text,
ADD COLUMN IF NOT EXISTS background_check_date date,
ADD COLUMN IF NOT EXISTS drug_test_date date,
ADD COLUMN IF NOT EXISTS last_review_date date,
ADD COLUMN IF NOT EXISTS next_review_date date;

-- Create technician preferences table
CREATE TABLE technician_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(technician_id, key)
);

-- Create technician notes table
CREATE TABLE technician_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  note_type text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT technician_notes_type_check CHECK (note_type IN ('performance', 'disciplinary', 'achievement', 'general'))
);

-- Enable RLS
ALTER TABLE technician_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for technician_preferences
CREATE POLICY "Enable read access for all users"
  ON technician_preferences
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable all access for admins"
  ON technician_preferences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create policies for technician_notes
CREATE POLICY "Enable read access for admins and managers"
  ON technician_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Enable all access for admins"
  ON technician_notes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX technician_preferences_technician_id_idx ON technician_preferences(technician_id);
CREATE INDEX technician_notes_technician_id_idx ON technician_notes(technician_id);
CREATE INDEX technician_notes_user_id_idx ON technician_notes(user_id);

-- Update existing technicians with sample data
UPDATE technicians
SET
  address = '123 Tech Street',
  city = 'Atlanta',
  state = 'GA',
  zip = '30303',
  license_number = 'HVAC-2025-' || first_name,
  license_expiry = '2026-12-31',
  vehicle_number = 'TECH-' || id::text,
  vehicle_make = 'Ford',
  vehicle_model = 'Transit',
  vehicle_year = '2024',
  shirt_size = 'L',
  boot_size = '10',
  preferred_name = first_name,
  background_check_date = hire_date,
  drug_test_date = hire_date,
  last_review_date = hire_date,
  next_review_date = hire_date + interval '1 year'
WHERE email IN ('jane.tech@airlast.com', 'john.tech@airlast.com');

-- Add sample preferences
WITH tech_ids AS (
  SELECT id, first_name FROM technicians
)
INSERT INTO technician_preferences (technician_id, key, value)
SELECT
  t.id,
  p.key,
  p.value::jsonb
FROM tech_ids t,
LATERAL (
  VALUES
    ('Jane', 'notification_preferences', '{"email": true, "sms": true, "push": false}'),
    ('Jane', 'schedule_preferences', '{"preferred_start_time": "08:00", "preferred_end_time": "17:00", "max_jobs_per_day": 6}'),
    ('John', 'notification_preferences', '{"email": true, "sms": true, "push": true}'),
    ('John', 'schedule_preferences', '{"preferred_start_time": "07:00", "preferred_end_time": "16:00", "max_jobs_per_day": 5}')
) AS p(tech_name, key, value)
WHERE t.first_name = p.tech_name;

-- Add sample notes
WITH tech_ids AS (
  SELECT id, first_name FROM technicians
),
admin_user AS (
  SELECT id FROM users WHERE role = 'admin' LIMIT 1
)
INSERT INTO technician_notes (technician_id, user_id, note_type, content)
SELECT
  t.id,
  (SELECT id FROM admin_user),
  n.note_type,
  n.content
FROM tech_ids t,
LATERAL (
  VALUES
    ('Jane', 'performance', 'Excellent work on preventative maintenance tasks. Consistently meets deadlines.'),
    ('Jane', 'achievement', 'Completed advanced HVAC certification with high marks.'),
    ('John', 'performance', 'Shows great initiative in learning new skills and technologies.'),
    ('John', 'general', 'Requested additional training for new equipment installation.')
) AS n(tech_name, note_type, content)
WHERE t.first_name = n.tech_name;
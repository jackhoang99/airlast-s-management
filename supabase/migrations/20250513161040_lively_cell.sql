/*
  # Create job_presets table
  
  1. New Tables
    - job_presets: Store saved job templates
      - id (uuid)
      - name (text)
      - data (jsonb)
      - created_at (timestamptz)
      - updated_at (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE job_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_presets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
  ON job_presets
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON job_presets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert some default presets
INSERT INTO job_presets (name, data) VALUES
  ('Standard PM Visit', jsonb_build_object(
    'type', 'preventative maintenance',
    'service_line', 'HVAC',
    'description', 'Regular preventative maintenance visit',
    'schedule_duration', '1.00',
    'service_contract', 'Standard'
  )),
  ('Emergency Service Call', jsonb_build_object(
    'type', 'service call',
    'service_line', 'HVAC',
    'description', 'Emergency service call',
    'schedule_duration', '2.00',
    'service_contract', 'Standard'
  )),
  ('Quarterly Maintenance', jsonb_build_object(
    'type', 'preventative maintenance',
    'service_line', 'HVAC',
    'description', 'Quarterly preventative maintenance',
    'schedule_duration', '4.00',
    'service_contract', 'Standard'
  ));
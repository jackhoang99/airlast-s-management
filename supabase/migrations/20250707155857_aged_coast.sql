/*
  # Add job reminders functionality

  1. New Tables
    - `job_reminders` - Stores reminder settings and history for jobs
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `reminder_type` (text) - Type of reminder (email, in_app, sms)
      - `scheduled_for` (timestamp) - When the reminder should be sent
      - `sent_at` (timestamp) - When the reminder was actually sent
      - `recipient` (text) - Email or other identifier for recipient
      - `status` (text) - Status of the reminder (pending, sent, failed)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `job_reminders` table
    - Add policies for authenticated users
*/

-- Create job_reminders table
CREATE TABLE IF NOT EXISTS job_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('email', 'in_app', 'sms')),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  recipient text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz DEFAULT now(),
  error_message text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS job_reminders_job_id_idx ON job_reminders(job_id);
CREATE INDEX IF NOT EXISTS job_reminders_scheduled_for_idx ON job_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS job_reminders_status_idx ON job_reminders(status);

-- Enable RLS
ALTER TABLE job_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for authenticated users" 
  ON job_reminders
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
  ON job_reminders
  FOR SELECT 
  TO public 
  USING (true);

-- Add configuration for reminder settings
INSERT INTO settings (key, value, description)
VALUES (
  'job_reminders', 
  jsonb_build_object(
    'enabled', true,
    'default_email', 'jackhoang.99@gmail.com',
    'days_before', 7,
    'reminder_types', array['email', 'in_app'],
    'auto_schedule', true
  ),
  'Configuration for job reminder system'
) ON CONFLICT (key) DO NOTHING;
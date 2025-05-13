/*
  # Update technicians table structure
  
  1. Changes
    - Add all technician details to single table
    - Remove preferences and notes tables
    - Add new fields for comprehensive technician info
  2. Data
    - Update existing technicians with sample data
*/

-- First remove the tables we don't need
DROP TABLE IF EXISTS technician_preferences CASCADE;
DROP TABLE IF EXISTS technician_notes CASCADE;

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
ADD COLUMN IF NOT EXISTS next_review_date date,
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS notes jsonb DEFAULT '[]'::jsonb;

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
  next_review_date = hire_date + interval '1 year',
  preferences = jsonb_build_object(
    'notification_preferences', jsonb_build_object(
      'email', true,
      'sms', true,
      'push', first_name = 'John'
    ),
    'schedule_preferences', jsonb_build_object(
      'preferred_start_time', CASE WHEN first_name = 'Jane' THEN '08:00' ELSE '07:00' END,
      'preferred_end_time', CASE WHEN first_name = 'Jane' THEN '17:00' ELSE '16:00' END,
      'max_jobs_per_day', CASE WHEN first_name = 'Jane' THEN 6 ELSE 5 END
    )
  ),
  notes = CASE 
    WHEN first_name = 'Jane' THEN 
      jsonb_build_array(
        jsonb_build_object(
          'type', 'performance',
          'content', 'Excellent work on preventative maintenance tasks. Consistently meets deadlines.',
          'created_at', now()
        ),
        jsonb_build_object(
          'type', 'achievement',
          'content', 'Completed advanced HVAC certification with high marks.',
          'created_at', now()
        )
      )
    ELSE 
      jsonb_build_array(
        jsonb_build_object(
          'type', 'performance',
          'content', 'Shows great initiative in learning new skills and technologies.',
          'created_at', now()
        ),
        jsonb_build_object(
          'type', 'general',
          'content', 'Requested additional training for new equipment installation.',
          'created_at', now()
        )
      )
    END
WHERE email IN ('jane.tech@airlast.com', 'john.tech@airlast.com');
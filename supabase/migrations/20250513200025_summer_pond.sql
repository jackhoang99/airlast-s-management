/*
  # Update job_presets table to use user_id only
  
  1. Changes
    - Remove owner_id column
    - Keep user_id with foreign key to users table
    - Update RLS policies to use user_id
  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS job_presets CASCADE;

-- Create job_presets table with simplified structure
CREATE TABLE job_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  data jsonb NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_presets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create own presets"
ON job_presets
FOR INSERT
TO authenticated
WITH CHECK (user_id IN (SELECT id FROM users WHERE username = current_user));

CREATE POLICY "Users can view all presets"
ON job_presets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own presets"
ON job_presets
FOR UPDATE
TO authenticated
USING (user_id IN (SELECT id FROM users WHERE username = current_user))
WITH CHECK (user_id IN (SELECT id FROM users WHERE username = current_user));

CREATE POLICY "Users can delete own presets"
ON job_presets
FOR DELETE
TO authenticated
USING (user_id IN (SELECT id FROM users WHERE username = current_user));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS job_presets_name_idx ON job_presets(name);
CREATE INDEX IF NOT EXISTS job_presets_user_id_idx ON job_presets(user_id);
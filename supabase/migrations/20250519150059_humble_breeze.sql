/*
  # Add job_technicians table for multiple technician assignments
  
  1. New Tables
    - `job_technicians`: Junction table to allow many-to-many relationship between jobs and technicians
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `technician_id` (uuid, foreign key to users)
      - `is_primary` (boolean) - Indicates if this is the primary technician
      - `created_at` (timestamptz)
  
  2. Changes
    - Keep existing technician_id in jobs table for backward compatibility
    - Add new junction table for multiple assignments
  
  3. Security
    - Enable RLS on job_technicians table
    - Add policies for authenticated users
*/

-- Create job_technicians table
CREATE TABLE IF NOT EXISTS job_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES users(id),
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, technician_id)
);

-- Enable RLS
ALTER TABLE job_technicians ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
  ON job_technicians
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON job_technicians
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS job_technicians_job_id_idx ON job_technicians(job_id);
CREATE INDEX IF NOT EXISTS job_technicians_technician_id_idx ON job_technicians(technician_id);
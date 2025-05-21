/*
  # Add job_items table
  
  1. New Tables
    - `job_items`: Store items associated with jobs
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `code` (text, not null)
      - `name` (text, not null)
      - `service_line` (text, not null)
      - `quantity` (integer, not null)
      - `unit_cost` (numeric(10,2), not null)
      - `total_cost` (numeric(10,2), not null)
      - `type` (text, not null)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on job_items table
    - Add policies for authenticated users
*/

-- Create job_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  service_line text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric(10,2) NOT NULL,
  total_cost numeric(10,2) NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_items_type_check CHECK (type IN ('part', 'labor', 'item'))
);

-- Enable RLS
ALTER TABLE job_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
  ON job_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON job_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS job_items_job_id_idx ON job_items(job_id);
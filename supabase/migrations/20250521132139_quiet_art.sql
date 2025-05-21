/*
  # Create job_items table and enable RLS
  
  1. Changes
    - Create job_items table if it doesn't exist
    - Add foreign key constraint to jobs table
    - Enable RLS on job_items table
    - Add policies for authenticated users
  2. Security
    - Allow public read access
    - Allow authenticated users to perform all operations
*/

-- Create job_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
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

-- Add foreign key constraint
ALTER TABLE job_items
ADD CONSTRAINT job_items_job_id_fkey
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS job_items_job_id_idx ON job_items(job_id);

-- Enable RLS
ALTER TABLE job_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Enable all access for authenticated users" ON job_items
  FOR ALL 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON job_items
  FOR SELECT
  TO public
  USING (true);
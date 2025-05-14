/*
  # Update job_items table and add sample data
  
  1. Changes
    - Drop existing policies to avoid conflicts
    - Create job_items table if it doesn't exist
    - Add sample job items for testing
  2. Data Structure
    - Items include code, name, service line, quantity, unit cost
    - Support for parts, labor, and other item types
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable read access for all users" ON job_items;
  DROP POLICY IF EXISTS "Enable all access for authenticated users" ON job_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

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

-- Insert sample job items for testing
WITH job_ids AS (
  SELECT id FROM jobs LIMIT 3
)
INSERT INTO job_items (job_id, code, name, service_line, quantity, unit_cost, total_cost, type)
SELECT 
  job_id,
  item_code,
  item_name,
  'TRNG',
  item_quantity,
  item_unit_cost,
  item_quantity * item_unit_cost,
  item_type
FROM job_ids,
LATERAL (
  VALUES 
    (job_ids.id, 'LABOR-FAKE-REG', 'FAKE Tech Labor Rate (Regular)', 1, 40.00, 'labor'),
    (job_ids.id, 'HULL-16-20-1', 'Hull Replacement Piece 16×20×2', 1, 135.00, 'part')
) AS i(job_id, item_code, item_name, item_quantity, item_unit_cost, item_type);

-- Add more sample items for one job to demonstrate grouping
WITH job_id AS (
  SELECT id FROM jobs ORDER BY created_at DESC LIMIT 1
)
INSERT INTO job_items (job_id, code, name, service_line, quantity, unit_cost, total_cost, type)
SELECT 
  job_id.id,
  item_code,
  item_name,
  'TRNG',
  item_quantity,
  item_unit_cost,
  item_quantity * item_unit_cost,
  item_type
FROM job_id,
LATERAL (
  VALUES 
    ('LABOR-FAKE-REG', 'FAKE Tech Labor Rate (Regular)', 2, 40.00, 'labor'),
    ('HULL-16-20-1', 'Hull Replacement Piece 16×20×2', 2, 135.00, 'part')
) AS i(item_code, item_name, item_quantity, item_unit_cost, item_type);
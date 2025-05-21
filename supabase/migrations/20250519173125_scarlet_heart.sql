/*
  # Split job_item_prices into separate tables
  
  1. New Tables
    - `job_item_part_prices`: Store predefined prices for parts
    - `job_item_labor_prices`: Store predefined prices for labor
    - `job_item_other_prices`: Store predefined prices for other items
  
  2. Changes
    - Migrate data from job_item_prices to type-specific tables
    - Add type-specific fields to each table
    - Maintain existing data and relationships
  
  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Create job_item_part_prices table
CREATE TABLE IF NOT EXISTS job_item_part_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  service_line text NOT NULL,
  unit_cost numeric(10,2) NOT NULL,
  manufacturer text,
  model_number text,
  category text,
  inventory_count integer,
  reorder_threshold integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_item_labor_prices table
CREATE TABLE IF NOT EXISTS job_item_labor_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  service_line text NOT NULL,
  unit_cost numeric(10,2) NOT NULL,
  skill_level text,
  is_overtime boolean DEFAULT false,
  is_emergency boolean DEFAULT false,
  duration_hours numeric(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_item_other_prices table
CREATE TABLE IF NOT EXISTS job_item_other_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  service_line text NOT NULL,
  unit_cost numeric(10,2) NOT NULL,
  category text,
  is_taxable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE job_item_part_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_item_labor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_item_other_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for job_item_part_prices
CREATE POLICY "Enable read access for all users"
  ON job_item_part_prices
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON job_item_part_prices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for job_item_labor_prices
CREATE POLICY "Enable read access for all users"
  ON job_item_labor_prices
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON job_item_labor_prices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for job_item_other_prices
CREATE POLICY "Enable read access for all users"
  ON job_item_other_prices
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON job_item_other_prices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_job_item_part_prices_updated_at
  BEFORE UPDATE ON job_item_part_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_item_labor_prices_updated_at
  BEFORE UPDATE ON job_item_labor_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_item_other_prices_updated_at
  BEFORE UPDATE ON job_item_other_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS job_item_part_prices_code_idx ON job_item_part_prices(code);
CREATE INDEX IF NOT EXISTS job_item_part_prices_service_line_idx ON job_item_part_prices(service_line);
CREATE INDEX IF NOT EXISTS job_item_labor_prices_code_idx ON job_item_labor_prices(code);
CREATE INDEX IF NOT EXISTS job_item_labor_prices_service_line_idx ON job_item_labor_prices(service_line);
CREATE INDEX IF NOT EXISTS job_item_other_prices_code_idx ON job_item_other_prices(code);
CREATE INDEX IF NOT EXISTS job_item_other_prices_service_line_idx ON job_item_other_prices(service_line);

-- Migrate data from job_item_prices to type-specific tables
INSERT INTO job_item_part_prices (
  code, name, description, service_line, unit_cost
)
SELECT 
  code, name, description, service_line, unit_cost
FROM 
  job_item_prices
WHERE 
  type = 'part';

INSERT INTO job_item_labor_prices (
  code, name, description, service_line, unit_cost
)
SELECT 
  code, name, description, service_line, unit_cost
FROM 
  job_item_prices
WHERE 
  type = 'labor';

INSERT INTO job_item_other_prices (
  code, name, description, service_line, unit_cost
)
SELECT 
  code, name, description, service_line, unit_cost
FROM 
  job_item_prices
WHERE 
  type = 'item';
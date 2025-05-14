/*
  # Create job_item_prices table
  
  1. New Tables
    - `job_item_prices`: Store predefined prices for job items
      - `id` (uuid, primary key)
      - `code` (text, unique, not null) - Item code
      - `name` (text, not null) - Item name
      - `description` (text) - Optional description
      - `service_line` (text, not null) - Service line code
      - `unit_cost` (numeric(10,2), not null) - Standard unit cost
      - `type` (text, not null) - Item type (part, labor, item)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on job_item_prices table
    - Add policies for authenticated users
*/

-- Create job_item_prices table
CREATE TABLE IF NOT EXISTS job_item_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  service_line text NOT NULL,
  unit_cost numeric(10,2) NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT job_item_prices_type_check CHECK (type IN ('part', 'labor', 'item'))
);

-- Enable RLS
ALTER TABLE job_item_prices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
  ON job_item_prices
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable all access for authenticated users"
  ON job_item_prices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS job_item_prices_code_idx ON job_item_prices(code);
CREATE INDEX IF NOT EXISTS job_item_prices_service_line_idx ON job_item_prices(service_line);
CREATE INDEX IF NOT EXISTS job_item_prices_type_idx ON job_item_prices(type);

-- Insert sample job item prices
INSERT INTO job_item_prices (code, name, description, service_line, unit_cost, type) VALUES
  ('BOLT-SS5', 'Self Sealing Stem Bolt', 'High-quality self-sealing stem bolt', 'HVACGEN', 15.00, 'part'),
  ('COUP-500', 'Domestic Coupler', 'Standard domestic coupler for residential units', 'HVACGEN', 80.00, 'part'),
  ('COUP-FLUX', 'Flux Coupler', 'Advanced flux coupler for commercial systems', 'HVACGEN', 120.00, 'part'),
  ('COUP-MICRO', 'Microtype Coupler', 'Precision microtype coupler', 'HVACGEN', 95.00, 'part'),
  ('DILITHIUM', 'Dilithium Crystal', 'High-energy dilithium crystal for power systems', 'HVACGEN', 1500.00, 'part'),
  ('EXT-REFAL', 'Plasma Extinguisher Refill', 'Refill for plasma fire extinguishers', 'SAFT', 75.99, 'part'),
  ('HELIX-10-20-1', 'Helix Replacement Piece 10x20x2', 'Helix replacement part 10x20x2', 'HVACGEN', 275.00, 'part'),
  ('HELIX-20-30-1', 'Helix Replacement Piece 20x30x1', 'Helix replacement part 20x30x1', 'HVACGEN', 320.00, 'part'),
  ('IMAGER', 'Holo-Imager', 'Holographic imaging device for system diagnostics', 'TESTBAL', 350.00, 'part'),
  ('INSP-PHASER', 'Phaser Wave Inspection', 'Phaser wave inspection tool', 'TESTBAL', 1200.00, 'part'),
  ('LABOR-FAKE-OT', 'FAKE Tech Labor Rate (Overtime)', 'Overtime labor rate', 'TRNG', 112.50, 'labor'),
  ('LABOR-FAKE-REG', 'FAKE Tech Labor Rate (Regular)', 'Regular labor rate', 'TRNG', 85.00, 'labor'),
  ('LABOR-MICRO', 'Laser Micrometer', 'Precision laser micrometer tool', 'TESTBAL', 650.00, 'part'),
  ('LMCP-1', 'Level 1 Main Computer Diagnostic', 'Level 1 diagnostic service', 'TESTBAL', 1200.00, 'item'),
  ('LSSC-1', 'Life Support Service Call', 'Emergency life support system service', 'SAFT', 2450.00, 'item'),
  ('REGU-ANTI', 'Antimatter Regulator', 'Antimatter flow regulator', 'HVACGEN', 2300.00, 'part'),
  ('SPACE-DISPOSAL', 'Space Disposal', 'Proper disposal of hazardous materials', 'SAFT', 99.99, 'item'),
  ('TRICORDER', 'Tricorder', 'Multi-function diagnostic device', 'TESTBAL', 800.00, 'part'),
  ('WARP-COIL', 'Warp Coil', 'High-efficiency warp coil for energy systems', 'HVACGEN', 15000.00, 'part');

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_job_item_prices_updated_at
  BEFORE UPDATE ON job_item_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
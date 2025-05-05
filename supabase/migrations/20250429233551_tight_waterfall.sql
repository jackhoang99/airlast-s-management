/*
  # Create configuration table

  1. New Tables
    - `configuration`
      - `id` (uuid, primary key)
      - `key` (text, unique, not null)
      - `value` (text, not null)
      - `created_at` (timestamptz, default: now())
  2. Security
    - Enable RLS on `configuration` table
    - Add policy for public read access
    - Add policy for authenticated users to manage configuration
  3. Data
    - Insert default empty logo_url configuration
*/

-- Create the configuration table
CREATE TABLE IF NOT EXISTS configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE configuration ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can read configuration" ON configuration;
  DROP POLICY IF EXISTS "Authenticated users can manage configuration" ON configuration;
END $$;

-- Allow public read access to configuration
CREATE POLICY "Anyone can read configuration"
  ON configuration
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to manage configuration
CREATE POLICY "Authenticated users can manage configuration"
  ON configuration
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default logo configuration
INSERT INTO configuration (key, value)
VALUES ('logo_url', '') 
ON CONFLICT (key) DO NOTHING;
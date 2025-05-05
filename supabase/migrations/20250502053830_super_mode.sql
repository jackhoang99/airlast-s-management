-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable read access for all users" ON companies;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON companies;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON companies;
  DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON companies;
  DROP POLICY IF EXISTS "Enable read access for all users" ON locations;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON locations;
  DROP POLICY IF EXISTS "Enable update for authenticated users only" ON locations;
  DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON locations;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS companies_status_idx ON companies(status);
CREATE INDEX IF NOT EXISTS locations_company_id_idx ON locations(company_id);
CREATE INDEX IF NOT EXISTS locations_status_idx ON locations(status);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Enable read access for all users" ON companies
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON companies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON companies
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON companies
  FOR DELETE TO authenticated USING (true);

-- Locations policies
CREATE POLICY "Enable read access for all users" ON locations
  FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON locations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON locations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON locations
  FOR DELETE TO authenticated USING (true);
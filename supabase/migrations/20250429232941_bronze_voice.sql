/*
  # Create companies table

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `address` (text, not null)
      - `city` (text, not null)
      - `state` (text, not null)
      - `zip` (text, not null)
      - `phone` (text, nullable)
      - `status` (text, not null, default: 'Active')
      - `created_at` (timestamptz, default: now())
      - `updated_at` (timestamptz, nullable)
  2. Security
    - Enable RLS on `companies` table
    - Add policy for authenticated users to perform all operations
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can perform all operations on companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
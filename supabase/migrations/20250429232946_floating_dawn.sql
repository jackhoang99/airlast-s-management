/*
  # Create locations table

  1. New Tables
    - `locations`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies.id)
      - `name` (text, not null)
      - `address` (text, not null)
      - `city` (text, not null)
      - `state` (text, not null)
      - `zip` (text, not null)
      - `status` (text, not null, default: 'Active')
      - `created_at` (timestamptz, default: now())
      - `updated_at` (timestamptz, nullable)
  2. Security
    - Enable RLS on `locations` table
    - Add policy for authenticated users to perform all operations
*/

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can perform all operations on locations"
  ON locations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
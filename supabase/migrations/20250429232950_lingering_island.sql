/*
  # Create tags tables

  1. New Tables
    - `tags`
      - `id` (uuid, primary key)
      - `name` (text, not null, unique)
      - `created_at` (timestamptz, default: now())
    - `company_tags`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies.id)
      - `tag_id` (uuid, foreign key to tags.id)
      - `created_at` (timestamptz, default: now())
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to perform all operations
*/

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can perform all operations on tags"
  ON tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS company_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  tag_id uuid NOT NULL REFERENCES tags(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, tag_id)
);

ALTER TABLE company_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can perform all operations on company_tags"
  ON company_tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
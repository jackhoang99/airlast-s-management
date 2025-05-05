/*
  # Add logo URL to configuration

  1. New Tables
    - `configuration`
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (text)
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `configuration` table
    - Add policy for authenticated users to read configuration
*/

CREATE TABLE IF NOT EXISTS configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read configuration"
  ON configuration
  FOR SELECT
  TO public
  USING (true);

INSERT INTO configuration (key, value) VALUES 
  ('logo_url', 'https://airlast.com/images/logos/airlast-logo.svg?_cchid=0f92eea093865093041e4410595c74a8');
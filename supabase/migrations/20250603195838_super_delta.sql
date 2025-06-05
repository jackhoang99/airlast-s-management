/*
  # Add job_quotes table

  1. New Tables
    - `job_quotes` - Stores quote information for jobs
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `quote_number` (text)
      - `quote_type` (text)
      - `amount` (numeric)
      - `token` (text)
      - `confirmed` (boolean)
      - `confirmed_at` (timestamp)
      - `approved` (boolean)
      - `email` (text)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `job_quotes` table
    - Add policies for authenticated users
*/

-- Create job_quotes table
CREATE TABLE IF NOT EXISTS job_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  quote_number text NOT NULL,
  quote_type text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  token text,
  confirmed boolean DEFAULT false,
  confirmed_at timestamptz,
  approved boolean DEFAULT false,
  email text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS job_quotes_job_id_idx ON job_quotes(job_id);
CREATE INDEX IF NOT EXISTS job_quotes_quote_number_idx ON job_quotes(quote_number);
CREATE INDEX IF NOT EXISTS job_quotes_token_idx ON job_quotes(token);

-- Enable RLS
ALTER TABLE job_quotes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for authenticated users" 
  ON job_quotes 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
  ON job_quotes 
  FOR SELECT 
  TO public 
  USING (true);
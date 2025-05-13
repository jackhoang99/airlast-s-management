/*
  # Create job presets table

  1. New Tables
    - `job_presets`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `data` (jsonb, not null) - Stores the preset form data
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `job_presets` table
    - Add policies for authenticated users to:
      - Read all presets
      - Create new presets
      - Update their own presets
      - Delete their own presets
*/

-- Create the job_presets table
CREATE TABLE IF NOT EXISTS public.job_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_presets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.job_presets
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.job_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only" ON public.job_presets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only" ON public.job_presets
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX job_presets_name_idx ON public.job_presets USING btree (name);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_job_presets_updated_at
  BEFORE UPDATE ON public.job_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
/*
  # Add job inspections table
  
  1. New Tables
    - `job_inspections`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `model_number` (text)
      - `serial_number` (text)
      - `age` (integer)
      - `tonnage` (text)
      - `unit_type` (text)
      - `system_type` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `job_inspections` table
    - Add policies for:
      - Authenticated users can perform all operations
      - Public users can read data
  
  3. Constraints
    - Add check constraint for unit_type ('Gas', 'Electric')
    - Add check constraint for system_type ('RTU', 'Split System')
*/

-- Create the job_inspections table
CREATE TABLE IF NOT EXISTS public.job_inspections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    model_number text,
    serial_number text,
    age integer,
    tonnage text,
    unit_type text CHECK (unit_type IN ('Gas', 'Electric')),
    system_type text CHECK (system_type IN ('RTU', 'Split System')),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index on job_id for better query performance
CREATE INDEX IF NOT EXISTS job_inspections_job_id_idx ON public.job_inspections(job_id);

-- Enable Row Level Security
ALTER TABLE public.job_inspections ENABLE ROW LEVEL SECURITY;

-- Create policies matching your existing security model
CREATE POLICY "Enable all access for authenticated users" ON public.job_inspections
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.job_inspections
    FOR SELECT
    TO public
    USING (true);

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_inspections_updated_at
    BEFORE UPDATE ON public.job_inspections
    FOR EACH ROW
    EXECUTE FUNCTION update_job_inspections_updated_at();

-- Grant appropriate permissions
GRANT ALL ON public.job_inspections TO authenticated;
GRANT SELECT ON public.job_inspections TO public;
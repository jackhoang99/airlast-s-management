/*
  # Fix job_items table and RLS policies
  
  1. Changes
    - Check if table exists before creating
    - Check if constraints exist before adding
    - Check if policies exist before creating
    - Ensure all operations are idempotent
  2. Security
    - Enable RLS on job_items table
    - Add policies for authenticated users
*/

-- Check if job_items table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'job_items') THEN
    -- Create job_items table if it doesn't exist
    CREATE TABLE job_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id uuid NOT NULL,
      code text NOT NULL,
      name text NOT NULL,
      service_line text NOT NULL,
      quantity integer NOT NULL DEFAULT 1,
      unit_cost numeric(10,2) NOT NULL,
      total_cost numeric(10,2) NOT NULL,
      type text NOT NULL,
      created_at timestamp with time zone DEFAULT now(),
      CONSTRAINT job_items_type_check CHECK (type IN ('part', 'labor', 'item'))
    );
  END IF;
END $$;

-- Check if foreign key constraint exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'job_items_job_id_fkey' 
    AND table_name = 'job_items'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE job_items
    ADD CONSTRAINT job_items_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'job_items_job_id_idx'
  ) THEN
    CREATE INDEX job_items_job_id_idx ON job_items(job_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE job_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable all access for authenticated users" ON job_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Enable read access for all users" ON job_items;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add RLS policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'job_items' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON job_items
      FOR ALL 
      TO authenticated 
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'job_items' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON job_items
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;
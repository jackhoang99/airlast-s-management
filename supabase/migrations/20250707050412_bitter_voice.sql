/*
  # Fix job_repairs table name

  1. Changes
    - Rename job_repairs table to job_replacements to match existing code references
    - Update column name repair_approved to replacement_approved in jobs table
  
  This migration fixes the mismatch between table names in the database and code references.
*/

-- Rename job_repairs table to job_replacements if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_repairs') THEN
    ALTER TABLE public.job_repairs RENAME TO job_replacements;
  END IF;
END $$;

-- Rename repair_approved column to replacement_approved in jobs table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'repair_approved'
  ) THEN
    ALTER TABLE public.jobs RENAME COLUMN repair_approved TO replacement_approved;
  END IF;
END $$;
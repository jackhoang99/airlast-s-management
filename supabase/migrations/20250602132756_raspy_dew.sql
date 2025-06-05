-- Rename job_replacements table to job_repairs
ALTER TABLE public.job_replacements RENAME TO job_repairs;

-- Rename constraints
ALTER INDEX job_replacements_pkey RENAME TO job_repairs_pkey;
ALTER INDEX job_replacements_job_id_idx RENAME TO job_repairs_job_id_idx;
ALTER INDEX job_replacements_inspection_id_idx RENAME TO job_repairs_inspection_id_idx;

-- Rename foreign key constraints
ALTER TABLE public.job_repairs RENAME CONSTRAINT job_replacements_job_id_fkey TO job_repairs_job_id_fkey;
ALTER TABLE public.job_repairs RENAME CONSTRAINT job_replacements_inspection_id_fkey TO job_repairs_inspection_id_fkey;

-- Update trigger name
ALTER TRIGGER update_job_replacements_updated_at ON public.job_repairs RENAME TO update_job_repairs_updated_at;

-- Update trigger function name
CREATE OR REPLACE FUNCTION update_job_repairs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger function
DROP FUNCTION IF EXISTS update_job_replacements_updated_at() CASCADE;

-- Update comments
COMMENT ON COLUMN public.job_repairs.inspection_id IS 'References the specific inspection this repair is associated with';
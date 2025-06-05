-- Add inspection_id column to job_replacements table
ALTER TABLE public.job_replacements 
ADD COLUMN inspection_id UUID REFERENCES public.job_inspections(id);

-- Create an index on the inspection_id column for better query performance
CREATE INDEX job_replacements_inspection_id_idx ON public.job_replacements(inspection_id);

-- Add a comment to explain the column
COMMENT ON COLUMN public.job_replacements.inspection_id IS 'References the specific inspection this repair/replacement is associated with';
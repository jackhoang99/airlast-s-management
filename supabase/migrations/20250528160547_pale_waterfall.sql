-- Create the job_replacements table
CREATE TABLE IF NOT EXISTS public.job_replacements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    needs_crane boolean DEFAULT false,
    phase1 jsonb DEFAULT '{"description": "Economy Option", "cost": 0}'::jsonb,
    phase2 jsonb DEFAULT '{"description": "Standard Option", "cost": 0}'::jsonb,
    phase3 jsonb DEFAULT '{"description": "Premium Option", "cost": 0}'::jsonb,
    labor numeric(10,2) DEFAULT 0,
    refrigeration_recovery numeric(10,2) DEFAULT 0,
    start_up_costs numeric(10,2) DEFAULT 0,
    accessories jsonb DEFAULT '[]'::jsonb,
    thermostat_startup numeric(10,2) DEFAULT 0,
    removal_cost numeric(10,2) DEFAULT 0,
    warranty text,
    additional_items jsonb DEFAULT '[]'::jsonb,
    permit_cost numeric(10,2) DEFAULT 0,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index on job_id for better query performance
CREATE INDEX IF NOT EXISTS job_replacements_job_id_idx ON public.job_replacements(job_id);

-- Enable Row Level Security
ALTER TABLE public.job_replacements ENABLE ROW LEVEL SECURITY;

-- Create policies matching your existing security model
CREATE POLICY "Enable all access for authenticated users" ON public.job_replacements
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.job_replacements
    FOR SELECT
    TO public
    USING (true);

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_replacements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_replacements_updated_at
    BEFORE UPDATE ON public.job_replacements
    FOR EACH ROW
    EXECUTE FUNCTION update_job_replacements_updated_at();

-- Grant appropriate permissions
GRANT ALL ON public.job_replacements TO authenticated;
GRANT SELECT ON public.job_replacements TO public;
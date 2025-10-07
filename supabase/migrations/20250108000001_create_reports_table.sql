-- Create reports table
CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "report_number" "text" NOT NULL,
    "report_type" "text" NOT NULL CHECK (report_type IN ('inspection report', 'maintenance report', 'repair report', 'other')),
    "title" "text",
    "description" "text",
    "pdf_url" "text",
    "pdf_generated_at" timestamp with time zone,
    "selected_inspection_options" "uuid"[],
    "report_data" jsonb,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "public"."reports" 
ADD CONSTRAINT "reports_job_id_fkey" 
FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX "idx_reports_job_id" ON "public"."reports"("job_id");
CREATE INDEX "idx_reports_report_type" ON "public"."reports"("report_type");
CREATE INDEX "idx_reports_created_at" ON "public"."reports"("created_at");
CREATE INDEX "idx_reports_report_number" ON "public"."reports"("report_number");

-- Add unique constraint on report_number
ALTER TABLE "public"."reports" 
ADD CONSTRAINT "reports_report_number_key" UNIQUE ("report_number");

-- Add RLS policies
ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read reports for their jobs
CREATE POLICY "Users can view reports for their jobs" ON "public"."reports"
FOR SELECT USING (
    job_id IN (
        SELECT id FROM jobs WHERE id = job_id
    )
);

-- Policy for authenticated users to insert reports
CREATE POLICY "Users can insert reports" ON "public"."reports"
FOR INSERT WITH CHECK (true);

-- Policy for authenticated users to update reports
CREATE POLICY "Users can update reports" ON "public"."reports"
FOR UPDATE USING (
    job_id IN (
        SELECT id FROM jobs WHERE id = job_id
    )
);

-- Policy for authenticated users to delete reports
CREATE POLICY "Users can delete reports" ON "public"."reports"
FOR DELETE USING (
    job_id IN (
        SELECT id FROM jobs WHERE id = job_id
    )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_updated_at 
    BEFORE UPDATE ON "public"."reports" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

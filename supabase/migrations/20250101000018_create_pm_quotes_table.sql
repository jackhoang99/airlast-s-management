-- Create PM quotes table
CREATE TABLE IF NOT EXISTS "public"."pm_quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "checklist_types" "text"[] NOT NULL,
    "number_of_visits" integer NOT NULL DEFAULT 1,
    "cost_per_visit" decimal(10,2) NOT NULL DEFAULT 0,
    "total_cost" decimal(10,2) NOT NULL DEFAULT 0,
    "notes" "text",
    -- Enhanced fields for detailed PDF generation
    "comprehensive_visit_cost" decimal(10,2) DEFAULT 360,
    "filter_visit_cost" decimal(10,2) DEFAULT 320,
    "comprehensive_visit_description" "text",
    "filter_visit_description" "text",
    "unit_count" integer DEFAULT 1,
    "service_period" "text",
    "filter_visit_period" "text",
    -- New fields for commercial quote format
    "comprehensive_visits_count" integer DEFAULT 2,
    "filter_visits_count" integer DEFAULT 2,
    "total_comprehensive_cost" decimal(10,2) DEFAULT 720,
    "total_filter_cost" decimal(10,2) DEFAULT 640,
    "client_name" "text",
    "property_address" "text",
    "scope_of_work" "text",
    "service_breakdown" "text",
    "preventative_maintenance_services" "text"[],
    -- Toggle fields for enabling/disabling services
    "include_comprehensive_service" boolean DEFAULT true,
    "include_filter_change_service" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pm_quotes_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "public"."pm_quotes" 
ADD CONSTRAINT "pm_quotes_job_id_fkey" 
FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX "idx_pm_quotes_job_id" ON "public"."pm_quotes"("job_id");
CREATE INDEX "idx_pm_quotes_created_at" ON "public"."pm_quotes"("created_at");

-- Add RLS policies
ALTER TABLE "public"."pm_quotes" ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their own job PM quotes
CREATE POLICY "Users can view PM quotes for their jobs" ON "public"."pm_quotes"
FOR SELECT USING (
    auth.uid() IN (
        SELECT jt.technician_id 
        FROM job_technicians jt 
        WHERE jt.job_id = pm_quotes.job_id
    )
);

-- Policy for authenticated users to insert/update their own job PM quotes
CREATE POLICY "Users can insert/update PM quotes for their jobs" ON "public"."pm_quotes"
FOR ALL USING (
    auth.uid() IN (
        SELECT jt.technician_id 
        FROM job_technicians jt 
        WHERE jt.job_id = pm_quotes.job_id
    )
);

-- Add trigger to update updated_at column
CREATE TRIGGER "update_pm_quotes_updated_at" 
BEFORE UPDATE ON "public"."pm_quotes" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Add comment
COMMENT ON TABLE "public"."pm_quotes" IS 'Stores PM (Preventive Maintenance) quotes with checklist types, visit counts, and costs'; 
-- Create maintenance checklists table
CREATE TABLE IF NOT EXISTS "public"."job_maintenance_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "job_unit_id" "uuid",
    "task_description" "text" NOT NULL,
    "completed" boolean DEFAULT false,
    "notes" "text",
    "reading_value" "text",
    "task_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_maintenance_checklists_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "public"."job_maintenance_checklists" 
ADD CONSTRAINT "job_maintenance_checklists_job_id_fkey" 
FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;

ALTER TABLE "public"."job_maintenance_checklists" 
ADD CONSTRAINT "job_maintenance_checklists_job_unit_id_fkey" 
FOREIGN KEY ("job_unit_id") REFERENCES "public"."job_units"("id") ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX "idx_job_maintenance_checklists_job_id" ON "public"."job_maintenance_checklists"("job_id");
CREATE INDEX "idx_job_maintenance_checklists_job_unit_id" ON "public"."job_maintenance_checklists"("job_unit_id");
CREATE INDEX "idx_job_maintenance_checklists_task_order" ON "public"."job_maintenance_checklists"("task_order");

-- Add RLS policies
ALTER TABLE "public"."job_maintenance_checklists" ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their own job checklists
CREATE POLICY "Users can view maintenance checklists for their jobs" ON "public"."job_maintenance_checklists"
FOR SELECT USING (
    auth.uid() IN (
        SELECT jt.technician_id 
        FROM job_technicians jt 
        WHERE jt.job_id = job_maintenance_checklists.job_id
    )
);

-- Policy for authenticated users to insert/update their own job checklists
CREATE POLICY "Users can insert/update maintenance checklists for their jobs" ON "public"."job_maintenance_checklists"
FOR ALL USING (
    auth.uid() IN (
        SELECT jt.technician_id 
        FROM job_technicians jt 
        WHERE jt.job_id = job_maintenance_checklists.job_id
    )
);

-- Add trigger to update updated_at column
CREATE TRIGGER "update_job_maintenance_checklists_updated_at" 
BEFORE UPDATE ON "public"."job_maintenance_checklists" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Add comment
COMMENT ON TABLE "public"."job_maintenance_checklists" IS 'Stores maintenance checklist tasks for jobs with completion status and notes'; 
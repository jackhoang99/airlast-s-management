-- Add job_unit_id column to job_inspections table
ALTER TABLE "public"."job_inspections" 
ADD COLUMN "job_unit_id" uuid;

-- Add foreign key constraint
ALTER TABLE "public"."job_inspections" 
ADD CONSTRAINT "job_inspections_job_unit_id_fkey" 
FOREIGN KEY ("job_unit_id") REFERENCES "public"."job_units"("id") ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX "idx_job_inspections_job_unit_id" ON "public"."job_inspections"("job_unit_id");

-- Add comment to describe the column
COMMENT ON COLUMN "public"."job_inspections"."job_unit_id" IS 'Reference to the specific job unit this inspection belongs to';

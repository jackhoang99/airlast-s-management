-- Remove the system_type constraint from job_inspections table
ALTER TABLE "public"."job_inspections" 
DROP CONSTRAINT "job_inspections_system_type_check";

-- Add comment to describe the change
COMMENT ON COLUMN "public"."job_inspections"."system_type" IS 'System type for the inspected unit (free text)';

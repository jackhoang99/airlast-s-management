-- Add manufacture_name column to job_inspections table
ALTER TABLE "public"."job_inspections" 
ADD COLUMN "manufacture_name" text;

-- Add comment to describe the column
COMMENT ON COLUMN "public"."job_inspections"."manufacture_name" IS 'Manufacturer name for the inspected unit';

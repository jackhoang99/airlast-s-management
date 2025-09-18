-- Add belt_size and filter_size columns to job_inspections table
ALTER TABLE "public"."job_inspections" 
ADD COLUMN "belt_size" text;

ALTER TABLE "public"."job_inspections" 
ADD COLUMN "filter_size" text;

-- Add comments to describe the columns
COMMENT ON COLUMN "public"."job_inspections"."belt_size" IS 'Belt size for the inspected unit';
COMMENT ON COLUMN "public"."job_inspections"."filter_size" IS 'Filter size for the inspected unit';

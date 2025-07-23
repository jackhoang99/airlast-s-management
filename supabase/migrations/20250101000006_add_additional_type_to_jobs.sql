-- Add additional_type column to jobs table for PM subtypes
ALTER TABLE "public"."jobs" 
ADD COLUMN "additional_type" text;

-- Add comment to explain the field
COMMENT ON COLUMN "public"."jobs"."additional_type" IS 'Additional type for preventative maintenance jobs (e.g., PM Filter Change, PM Cleaning AC, PM Cleaning HEAT)'; 
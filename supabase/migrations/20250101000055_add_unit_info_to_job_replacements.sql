-- Add unit_info column to job_replacements table
ALTER TABLE "public"."job_replacements" 
ADD COLUMN "unit_info" jsonb DEFAULT '[]'::jsonb;

-- Add comment for the new column
COMMENT ON COLUMN "public"."job_replacements"."unit_info" IS 'Array of unit information objects containing descriptor and model name for each unit';

-- Add missing columns to job_quotes table
ALTER TABLE "public"."job_quotes" 
ADD COLUMN "selected_inspection_options" text[] DEFAULT NULL;

ALTER TABLE "public"."job_quotes" 
ADD COLUMN "selected_replacement_options" text[] DEFAULT NULL;

-- Add comments for the new columns
COMMENT ON COLUMN "public"."job_quotes"."selected_inspection_options" IS 'Array of inspection IDs that were selected for this quote';
COMMENT ON COLUMN "public"."job_quotes"."selected_replacement_options" IS 'Array of replacement IDs that were selected for this quote'; 
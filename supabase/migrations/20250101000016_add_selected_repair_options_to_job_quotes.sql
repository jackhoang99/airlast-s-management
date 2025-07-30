-- Add selected_repair_options column to job_quotes table
ALTER TABLE "public"."job_quotes" 
ADD COLUMN "selected_repair_options" text[] DEFAULT NULL;

-- Add comment for the new column
COMMENT ON COLUMN "public"."job_quotes"."selected_repair_options" IS 'Array of repair item IDs (job_items) that were selected for this repair quote';

-- Update the comment for selected_replacement_options to be more specific
COMMENT ON COLUMN "public"."job_quotes"."selected_replacement_options" IS 'Array of replacement IDs (job_replacements) that were selected for this replacement quote'; 
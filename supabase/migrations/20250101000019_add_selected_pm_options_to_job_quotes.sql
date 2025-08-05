-- Add selected_pm_options column to job_quotes table
ALTER TABLE "public"."job_quotes"
ADD COLUMN "selected_pm_options" uuid[] DEFAULT '{}';

COMMENT ON COLUMN "public"."job_quotes"."selected_pm_options" IS 'Array of PM quote IDs that were selected for this PM quote';

-- Update existing comment for selected_replacement_options to be more specific
COMMENT ON COLUMN "public"."job_quotes"."selected_replacement_options" IS 'Array of replacement IDs (job_replacements) that were selected for this replacement quote'; 
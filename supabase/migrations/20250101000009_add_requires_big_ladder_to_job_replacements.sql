-- Add requires_big_ladder field to job_replacements table
ALTER TABLE "public"."job_replacements" 
ADD COLUMN "requires_big_ladder" boolean DEFAULT false;

-- Add comment for the new column
COMMENT ON COLUMN "public"."job_replacements"."requires_big_ladder" IS 'Indicates whether a big ladder is required for this replacement job'; 
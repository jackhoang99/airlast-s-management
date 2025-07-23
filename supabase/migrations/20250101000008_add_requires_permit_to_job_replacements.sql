-- Add requires_permit field to job_replacements table
ALTER TABLE "public"."job_replacements" 
ADD COLUMN "requires_permit" boolean DEFAULT false;

-- Add comment for the new column
COMMENT ON COLUMN "public"."job_replacements"."requires_permit" IS 'Indicates whether a permit is required for this replacement job'; 
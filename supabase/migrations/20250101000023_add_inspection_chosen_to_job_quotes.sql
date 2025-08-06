-- Add inspection_chosen column to job_quotes table
-- This column will store the inspection IDs that were chosen for any quote type
ALTER TABLE "public"."job_quotes" 
ADD COLUMN "inspection_chosen" "uuid"[] DEFAULT '{}';

-- Add comment to explain the column
COMMENT ON COLUMN "public"."job_quotes"."inspection_chosen" IS 'Array of inspection IDs that were chosen for this quote (for all quote types, not just inspection quotes)';

-- Add index for better performance when querying by inspection_chosen
CREATE INDEX "idx_job_quotes_inspection_chosen" ON "public"."job_quotes" USING "gin" ("inspection_chosen"); 
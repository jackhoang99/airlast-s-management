-- Add quote_data JSON column to job_quotes table to store complete quote information
ALTER TABLE "public"."job_quotes" 
ADD COLUMN "quote_data" jsonb DEFAULT '{}'::jsonb;

-- Add comment for the new column
COMMENT ON COLUMN "public"."job_quotes"."quote_data" IS 'Stores complete quote data including selected inspections, replacements, job items, and other quote-specific information for preview functionality';

-- Create index on quote_data for better query performance
CREATE INDEX "idx_job_quotes_quote_data" ON "public"."job_quotes" USING GIN ("quote_data"); 
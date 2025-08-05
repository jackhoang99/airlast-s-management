-- Add PDF URL columns to job_quotes table
ALTER TABLE "public"."job_quotes" 
ADD COLUMN "pdf_url" text,
ADD COLUMN "pdf_generated_at" timestamp with time zone;

-- Add PDF URL columns to pm_quotes table  
ALTER TABLE "public"."pm_quotes" 
ADD COLUMN "pdf_url" text,
ADD COLUMN "pdf_generated_at" timestamp with time zone;

-- Add comments for the new columns
COMMENT ON COLUMN "public"."job_quotes"."pdf_url" IS 'Stores the URL of the generated PDF for consistent previews';
COMMENT ON COLUMN "public"."job_quotes"."pdf_generated_at" IS 'Timestamp when the PDF was last generated';
COMMENT ON COLUMN "public"."pm_quotes"."pdf_url" IS 'Stores the URL of the generated PDF for consistent previews';
COMMENT ON COLUMN "public"."pm_quotes"."pdf_generated_at" IS 'Timestamp when the PDF was last generated';

-- Create indexes for better query performance
CREATE INDEX "idx_job_quotes_pdf_url" ON "public"."job_quotes" ("pdf_url");
CREATE INDEX "idx_pm_quotes_pdf_url" ON "public"."pm_quotes" ("pdf_url"); 
-- Add pdf_url column to job_invoices table
ALTER TABLE "public"."job_invoices" 
ADD COLUMN "pdf_url" text;

-- Add comment for documentation
COMMENT ON COLUMN "public"."job_invoices"."pdf_url" IS 'Stores the URL of the generated PDF for consistent previews and email attachments';

-- Create index for better performance
CREATE INDEX "idx_job_invoices_pdf_url" ON "public"."job_invoices" ("pdf_url"); 
-- Add email_sent_at column to job_quotes table to track when quotes are actually sent via email
ALTER TABLE "public"."job_quotes"
ADD COLUMN "email_sent_at" timestamp with time zone;

COMMENT ON COLUMN "public"."job_quotes"."email_sent_at" IS 'Timestamp when the quote was actually sent via email to the customer'; 
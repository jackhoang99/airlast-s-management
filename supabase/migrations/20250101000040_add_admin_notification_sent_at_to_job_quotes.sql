-- Add admin_notification_sent_at column to job_quotes table
-- This prevents duplicate confirmation emails from being sent to admins

ALTER TABLE job_quotes
ADD COLUMN IF NOT EXISTS admin_notification_sent_at timestamptz;

-- Add comment to document the purpose of this column
COMMENT ON COLUMN job_quotes.admin_notification_sent_at IS 'Timestamp when admin notification email was sent to prevent duplicates';

/*
  # Add quote fields to jobs table
  
  1. Changes
    - Add quote_sent boolean field
    - Add quote_sent_at timestamp field
    - Add quote_token text field for confirmation link
    - Add quote_confirmed boolean field
    - Add quote_confirmed_at timestamp field
  2. Notes
    - Enables tracking of quote status
    - Supports customer confirmation workflow
*/

-- Add quote fields to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS quote_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quote_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS quote_token text,
ADD COLUMN IF NOT EXISTS quote_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quote_confirmed_at timestamptz;
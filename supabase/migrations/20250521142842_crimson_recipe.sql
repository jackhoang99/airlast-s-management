/*
  # Add quote fields to jobs table
  
  1. New Fields
    - `quote_sent` (boolean) - Indicates if quote has been sent to customer
    - `quote_sent_at` (timestamptz) - When the quote was sent
    - `quote_token` (text) - Unique token for quote confirmation
    - `quote_confirmed` (boolean) - Indicates if customer confirmed the quote
    - `quote_confirmed_at` (timestamptz) - When the quote was confirmed
  
  2. Purpose
    - Track quote status throughout the customer approval process
    - Enable secure confirmation links via tokens
    - Record timestamps for audit and reporting
*/

-- Add quote fields to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS quote_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quote_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS quote_token text,
ADD COLUMN IF NOT EXISTS quote_confirmed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS quote_confirmed_at timestamptz;
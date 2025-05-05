/*
  # Add missing fields to companies table

  1. Changes
    - Add address field (text)
    - Add zip field (text)  
    - Add phone field (text)
    - Create index on company name
*/

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add missing fields to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS zip text,
ADD COLUMN IF NOT EXISTS phone text;

-- Create index on company name for faster search
CREATE INDEX IF NOT EXISTS companies_name_idx ON companies USING gin (name gin_trgm_ops);
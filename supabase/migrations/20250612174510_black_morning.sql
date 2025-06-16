/*
  # Fix RLS for quotes and templates

  1. Security
    - Enable RLS on quote_templates table
    - Create public access policies for quote_templates
    - Create public access policies for storage.objects in templates bucket
    - Enable RLS on job_quotes table
    - Create public access policies for job_quotes
*/

-- First, ensure RLS is enabled on quote_templates table
ALTER TABLE IF EXISTS quote_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view all templates" ON quote_templates;
DROP POLICY IF EXISTS "Users can manage their templates" ON quote_templates;
DROP POLICY IF EXISTS "Public can view all templates" ON quote_templates;
DROP POLICY IF EXISTS "Public can manage all templates" ON quote_templates;

-- Create comprehensive policies for quote_templates with public access
CREATE POLICY "Public can view all templates" 
ON quote_templates
FOR SELECT 
USING (true);

CREATE POLICY "Public can manage all templates" 
ON quote_templates
FOR ALL 
USING (true)
WITH CHECK (true);

-- Storage bucket policies
-- First, ensure the templates bucket exists (this is idempotent)
DO $$
BEGIN
    -- This will be a no-op if the bucket already exists
    -- Fix: Use proper JSON syntax with double quotes
    PERFORM storage.create_bucket('templates', '{"public": true}');
EXCEPTION
    WHEN others THEN
        -- Bucket might already exist, which is fine
        NULL;
END $$;

-- Update storage bucket policies for templates
-- We need to handle storage policies differently

-- First, check if the policies exist and drop them if they do
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check and drop "Public Access" policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        EXECUTE 'DROP POLICY "Public Access" ON storage.objects';
    END IF;

    -- Check and drop "Public Upload Access" policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Upload Access'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        EXECUTE 'DROP POLICY "Public Upload Access" ON storage.objects';
    END IF;

    -- Check and drop "Public Update Access" policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Update Access'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        EXECUTE 'DROP POLICY "Public Update Access" ON storage.objects';
    END IF;

    -- Check and drop "Public Delete Access" policy
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Delete Access'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        EXECUTE 'DROP POLICY "Public Delete Access" ON storage.objects';
    END IF;
END $$;

-- Now create the new policies with public access for all operations
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'templates');

CREATE POLICY "Public Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Public Update Access" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'templates');

CREATE POLICY "Public Delete Access" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'templates');

-- Add RLS for job_quotes table
ALTER TABLE IF EXISTS job_quotes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view all quotes" ON job_quotes;
DROP POLICY IF EXISTS "Public can manage all quotes" ON job_quotes;

-- Create public access policies for job_quotes
CREATE POLICY "Public can view all quotes" 
ON job_quotes
FOR SELECT 
USING (true);

CREATE POLICY "Public can manage all quotes" 
ON job_quotes
FOR ALL 
USING (true)
WITH CHECK (true);
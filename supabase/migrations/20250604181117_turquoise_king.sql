/*
  # Fix Quote Templates RLS Policies

  1. Changes
     - Drop existing policies that might be causing conflicts
     - Create simple policies that allow authenticated users full access
     - Ensure storage bucket has proper permissions
*/

-- First, drop any existing policies that might be causing conflicts
DO $$
BEGIN
  -- Drop policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates') THEN
    DROP POLICY IF EXISTS "Enable all access for authenticated users" ON quote_templates;
    DROP POLICY IF EXISTS "Enable read access for all users" ON quote_templates;
    DROP POLICY IF EXISTS "Users can create own templates" ON quote_templates;
    DROP POLICY IF EXISTS "Users can update own templates" ON quote_templates;
    DROP POLICY IF EXISTS "Users can delete own templates" ON quote_templates;
    DROP POLICY IF EXISTS "Users can view all templates" ON quote_templates;
    DROP POLICY IF EXISTS "Users can create own presets" ON quote_templates;
    DROP POLICY IF EXISTS "Users can delete own presets" ON quote_templates;
    DROP POLICY IF EXISTS "Users can update own presets" ON quote_templates;
    DROP POLICY IF EXISTS "Users can view all presets" ON quote_templates;
  END IF;
END
$$;

-- Make sure RLS is enabled
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

-- Create simple policies for authenticated users
CREATE POLICY "Enable all access for authenticated users"
ON quote_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy for public read access
CREATE POLICY "Enable read access for all users"
ON quote_templates
FOR SELECT
TO public
USING (true);

-- Ensure storage permissions are set correctly
BEGIN;
  -- Make sure the templates bucket exists and has proper permissions
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('templates', 'templates', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

  -- Create policy to allow authenticated users to upload files
  DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
  CREATE POLICY "Allow authenticated users to upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'templates');

  -- Create policy to allow authenticated users to update files
  DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
  CREATE POLICY "Allow authenticated users to update files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'templates');

  -- Create policy to allow authenticated users to delete files
  DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;
  CREATE POLICY "Allow authenticated users to delete files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'templates');

  -- Create policy to allow public to read files
  DROP POLICY IF EXISTS "Allow public to read files" ON storage.objects;
  CREATE POLICY "Allow public to read files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'templates');
COMMIT;
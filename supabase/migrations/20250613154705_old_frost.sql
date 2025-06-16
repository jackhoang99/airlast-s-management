/*
  # Fix Quote Templates RLS Policies

  1. Security Updates
    - Drop existing conflicting policies on quote_templates table
    - Create clear, working policies for authenticated users
    - Ensure storage bucket policies allow authenticated users to upload files

  2. Changes
    - Remove duplicate/conflicting policies
    - Add proper INSERT policy for authenticated users
    - Add proper SELECT, UPDATE, DELETE policies
    - Ensure storage policies are correctly configured
*/

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON quote_templates;
DROP POLICY IF EXISTS "Enable read access for all users" ON quote_templates;
DROP POLICY IF EXISTS "Public can manage all quotes" ON quote_templates;
DROP POLICY IF EXISTS "Public can view all quotes" ON quote_templates;
DROP POLICY IF EXISTS "Users can view all presets" ON quote_templates;

-- Create clear, working policies for quote_templates
CREATE POLICY "Authenticated users can insert templates"
  ON quote_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view all templates"
  ON quote_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own templates"
  ON quote_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON quote_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow public read access for quote confirmation pages
CREATE POLICY "Public can view templates for quotes"
  ON quote_templates
  FOR SELECT
  TO public
  USING (true);

-- Ensure the templates storage bucket exists and has proper policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies that might conflict
DROP POLICY IF EXISTS "Authenticated users can upload templates" ON storage.objects;
DROP POLICY IF EXISTS "Public can view templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage template files" ON storage.objects;

-- Create storage policies for the templates bucket
CREATE POLICY "Authenticated users can upload to templates bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'templates');

CREATE POLICY "Authenticated users can update templates bucket"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can delete from templates bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view templates bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'templates');
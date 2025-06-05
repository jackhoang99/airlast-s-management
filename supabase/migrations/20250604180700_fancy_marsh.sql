/*
  # Fix Quote Templates RLS Policies

  1. Changes
     - Drop existing policies that might be causing conflicts
     - Create new policies using auth.uid() instead of users table lookup
     - Ensure all necessary policies are in place for proper template management
*/

-- First, drop any existing policies that might be causing conflicts
DO $$
BEGIN
  -- Drop policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Users can create own presets') THEN
    DROP POLICY "Users can create own presets" ON quote_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Users can delete own presets') THEN
    DROP POLICY "Users can delete own presets" ON quote_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Users can update own presets') THEN
    DROP POLICY "Users can update own presets" ON quote_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Users can view all presets') THEN
    DROP POLICY "Users can view all presets" ON quote_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Users can create own templates') THEN
    DROP POLICY "Users can create own templates" ON quote_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Users can update own templates') THEN
    DROP POLICY "Users can update own templates" ON quote_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Users can delete own templates') THEN
    DROP POLICY "Users can delete own templates" ON quote_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Users can view all templates') THEN
    DROP POLICY "Users can view all templates" ON quote_templates;
  END IF;
END
$$;

-- Make sure RLS is enabled
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

-- Create new policies using auth.uid() directly
CREATE POLICY "Users can create own templates"
ON quote_templates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
ON quote_templates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
ON quote_templates
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view all templates"
ON quote_templates
FOR SELECT
TO authenticated
USING (true);
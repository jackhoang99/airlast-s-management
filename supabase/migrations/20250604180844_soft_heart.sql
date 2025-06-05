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
  
  -- Also drop the general policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Enable all access for authenticated users') THEN
    DROP POLICY "Enable all access for authenticated users" ON quote_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Enable read access for all users') THEN
    DROP POLICY "Enable read access for all users" ON quote_templates;
  END IF;
END
$$;

-- Make sure RLS is enabled
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

-- Create general policies for authenticated users
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
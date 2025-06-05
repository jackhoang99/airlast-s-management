/*
  # Quote Templates Schema

  1. New Tables
    - `quote_templates` - Stores email and PDF templates for quotes
      - `id` (uuid, primary key)
      - `name` (text)
      - `template_data` (jsonb)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `quote_templates` table
    - Add policies for authenticated users
*/

-- Create quote_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_data jsonb NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on user_id for faster lookups if they don't exist
CREATE INDEX IF NOT EXISTS quote_templates_user_id_idx ON quote_templates(user_id);
CREATE INDEX IF NOT EXISTS quote_templates_name_idx ON quote_templates(name);

-- Enable RLS
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't already exist
DO $$
BEGIN
  -- Check if "Enable all access for authenticated users" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'quote_templates' 
    AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" 
      ON quote_templates 
      FOR ALL 
      TO authenticated 
      USING (true) 
      WITH CHECK (true);
  END IF;

  -- Check if "Enable read access for all users" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'quote_templates' 
    AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" 
      ON quote_templates 
      FOR SELECT 
      TO public 
      USING (true);
  END IF;

  -- Check if "Users can create own presets" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'quote_templates' 
    AND policyname = 'Users can create own presets'
  ) THEN
    CREATE POLICY "Users can create own presets"
      ON quote_templates
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id IN (SELECT id FROM users WHERE username = CURRENT_USER));
  END IF;

  -- Check if "Users can delete own presets" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'quote_templates' 
    AND policyname = 'Users can delete own presets'
  ) THEN
    CREATE POLICY "Users can delete own presets"
      ON quote_templates
      FOR DELETE
      TO authenticated
      USING (user_id IN (SELECT id FROM users WHERE username = CURRENT_USER));
  END IF;

  -- Check if "Users can update own presets" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'quote_templates' 
    AND policyname = 'Users can update own presets'
  ) THEN
    CREATE POLICY "Users can update own presets"
      ON quote_templates
      FOR UPDATE
      TO authenticated
      USING (user_id IN (SELECT id FROM users WHERE username = CURRENT_USER))
      WITH CHECK (user_id IN (SELECT id FROM users WHERE username = CURRENT_USER));
  END IF;

  -- Check if "Users can view all presets" policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'quote_templates' 
    AND policyname = 'Users can view all presets'
  ) THEN
    CREATE POLICY "Users can view all presets"
      ON quote_templates
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;
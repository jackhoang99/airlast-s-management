-- Create quote_templates table
CREATE TABLE IF NOT EXISTS quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_data jsonb NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS quote_templates_user_id_idx ON quote_templates(user_id);

-- Enable RLS
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for authenticated users" 
  ON quote_templates 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users" 
  ON quote_templates 
  FOR SELECT 
  TO public 
  USING (true);
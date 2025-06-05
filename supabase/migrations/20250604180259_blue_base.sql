/*
  # Add RLS policies for quote templates

  1. Changes
    - Enable RLS on quote_templates table
    - Add policies for authenticated users to:
      - Insert their own templates
      - Update their own templates
      - Delete their own templates
      - View all templates
    
  2. Security
    - Ensures users can only manage their own templates
    - Allows reading of all templates for template sharing
*/

-- Enable RLS
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own templates
CREATE POLICY "Users can create own templates"
ON quote_templates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own templates
CREATE POLICY "Users can update own templates"
ON quote_templates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own templates
CREATE POLICY "Users can delete own templates"
ON quote_templates
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow authenticated users to view all templates
CREATE POLICY "Users can view all templates"
ON quote_templates
FOR SELECT
TO authenticated
USING (true);
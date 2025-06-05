/*
  # Fix Replacement Quote Template Default

  1. Changes
    - Creates a function to copy an existing template to a new template type
    - Copies the existing repair template to create a replacement template
    - Sets the new replacement template as default
*/

-- Create a function to copy a template to a new template type
CREATE OR REPLACE FUNCTION copy_template_to_new_type(
  source_template_id UUID,
  new_template_name TEXT,
  new_template_type TEXT
) RETURNS UUID AS $$
DECLARE
  source_template RECORD;
  new_template_data JSONB;
  new_template_id UUID;
BEGIN
  -- Get the source template
  SELECT * INTO source_template FROM quote_templates WHERE id = source_template_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source template not found';
  END IF;
  
  -- Create new template data with the new template type
  new_template_data = source_template.template_data;
  new_template_data = jsonb_set(new_template_data, '{templateType}', to_jsonb(new_template_type));
  new_template_data = jsonb_set(new_template_data, '{isDefault}', 'true');
  
  -- Insert the new template
  INSERT INTO quote_templates (
    name,
    template_data,
    user_id,
    created_at,
    updated_at
  ) VALUES (
    new_template_name,
    new_template_data,
    source_template.user_id,
    now(),
    now()
  ) RETURNING id INTO new_template_id;
  
  RETURN new_template_id;
END;
$$ LANGUAGE plpgsql;

-- Find the default repair template
DO $$
DECLARE
  repair_template_id UUID;
  new_replacement_template_id UUID;
BEGIN
  -- Find the default repair template
  SELECT id INTO repair_template_id 
  FROM quote_templates 
  WHERE template_data->>'templateType' = 'repair' 
  AND template_data->>'isDefault' = 'true'
  LIMIT 1;
  
  -- If a default repair template exists, copy it to create a replacement template
  IF repair_template_id IS NOT NULL THEN
    -- First, unset any existing default replacement templates
    UPDATE quote_templates
    SET template_data = jsonb_set(template_data, '{isDefault}', 'false')
    WHERE template_data->>'templateType' = 'replacement'
    AND template_data->>'isDefault' = 'true';
    
    -- Copy the repair template to create a replacement template
    SELECT copy_template_to_new_type(
      repair_template_id,
      'Default Replacement Template',
      'replacement'
    ) INTO new_replacement_template_id;
    
    RAISE NOTICE 'Created new replacement template with ID: %', new_replacement_template_id;
  ELSE
    RAISE NOTICE 'No default repair template found to copy';
  END IF;
END
$$;

-- Drop the function as it's no longer needed
DROP FUNCTION IF EXISTS copy_template_to_new_type(UUID, TEXT, TEXT);
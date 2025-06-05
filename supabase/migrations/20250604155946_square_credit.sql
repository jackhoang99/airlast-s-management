/*
  # Add jsonb_set_default function

  This function is used to set a boolean field in a JSONB object.
  It's particularly useful for setting the isDefault flag in template_data.
*/

CREATE OR REPLACE FUNCTION jsonb_set_default(template_data jsonb, is_default boolean)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_set(template_data, '{isDefault}', to_jsonb(is_default));
END;
$$ LANGUAGE plpgsql;
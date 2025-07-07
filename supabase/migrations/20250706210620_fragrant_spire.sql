/*
  # Add Assets Table and Customer Assets Functionality

  1. New Tables
    - `assets` - Stores asset information for units
  
  2. Security
    - Enable RLS on the assets table
    - Add policies for secure access
*/

-- Create assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  model JSONB NOT NULL,
  inspection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create policy for assets
CREATE POLICY "Users can view all assets" 
  ON assets
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for inserting assets
CREATE POLICY "Users can insert assets" 
  ON assets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for updating assets
CREATE POLICY "Users can update assets" 
  ON assets
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add function to create asset from inspection
CREATE OR REPLACE FUNCTION create_asset_from_inspection()
RETURNS TRIGGER AS $$
BEGIN
  -- When an inspection is completed, create an asset record
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    INSERT INTO assets (
      unit_id,
      model,
      inspection_date
    ) VALUES (
      (SELECT unit_id FROM jobs WHERE id = NEW.job_id),
      jsonb_build_object(
        'model_number', NEW.model_number,
        'serial_number', NEW.serial_number,
        'age', NEW.age,
        'tonnage', NEW.tonnage,
        'unit_type', NEW.unit_type,
        'system_type', NEW.system_type,
        'job_id', NEW.job_id,
        'inspection_id', NEW.id
      ),
      NEW.updated_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for job_inspections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'create_asset_on_inspection_complete'
  ) THEN
    CREATE TRIGGER create_asset_on_inspection_complete
    AFTER INSERT OR UPDATE OF completed
    ON job_inspections
    FOR EACH ROW
    EXECUTE FUNCTION create_asset_from_inspection();
  END IF;
END $$;
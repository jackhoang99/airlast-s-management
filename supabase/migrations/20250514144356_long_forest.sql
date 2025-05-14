/*
  # Update jobs table type constraint
  
  1. Changes
    - Drop existing type constraint
    - Add new constraint with comprehensive job type list
  2. Notes
    - Matches all job types from job_types table
    - Maintains data integrity
*/

-- Drop existing constraint
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_type_check;

-- Add new constraint with comprehensive job type list
ALTER TABLE jobs 
ADD CONSTRAINT jobs_type_check 
CHECK (type IN (
  'administrative',
  'buildout',
  'cleaning',
  'construction',
  'consultation',
  'delivery',
  'design',
  'emergency service call',
  'exchange',
  'hookup',
  'inspection',
  'inspection repair',
  'installation',
  'pickup',
  'planned maintenance',
  'preventative maintenance',
  'priority inspection',
  'priority service call',
  'quality assurance',
  'reinspection',
  'repair',
  'replacement',
  'retrofit',
  'sales',
  'service call',
  'start up',
  'survey',
  'testing',
  'training',
  'unknown',
  'upgrade',
  'urgent service call',
  'warranty call'
));
/*
  # Add Jane as a user if not exists
  
  1. Changes
    - Check if user exists before inserting
    - Add user data if not present
  2. Data Integrity
    - Prevents duplicate user errors
    - Maintains existing data
*/

DO $$ 
BEGIN
  -- Only insert if user doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE username = 'jane.tech' 
    OR email = 'jane.tech@airlast.com'
  ) THEN
    INSERT INTO users (
      username,
      email,
      first_name,
      last_name,
      phone,
      role,
      status,
      services
    ) VALUES (
      'jane.tech',
      'jane.tech@airlast.com',
      'Jane',
      'Tech',
      '(555) 234-5678',
      'technician',
      'active',
      ARRAY['HVAC', 'COOLING', 'HEATING', 'MAINTENANCE', 'REPAIR', 'INSTALLATION']
    );
  END IF;
END $$;
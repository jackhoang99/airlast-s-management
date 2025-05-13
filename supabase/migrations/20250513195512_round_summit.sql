/*
  # Add test users and corresponding user records
  
  1. Changes
    - Add 3 test users to auth.users
    - Add corresponding records in public.users table
    - Set up different roles for testing
  2. Security
    - Use secure password hashing
    - Set proper role assignments
*/

-- First create the auth users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES
  -- Admin user
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'admin@airlast.demo',
    crypt('hvac', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"],"role":"admin"}',
    '{}'
  ),
  -- Manager user
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000', 
    'manager@airlast.demo',
    crypt('hvac', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"],"role":"manager"}',
    '{}'
  ),
  -- Technician user
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'tech@airlast.demo',
    crypt('hvac', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"],"role":"technician"}',
    '{}'
  );

-- Then create corresponding user records
INSERT INTO public.users (
  auth_id,
  username,
  email,
  first_name,
  last_name,
  role,
  status,
  services
)
SELECT
  id as auth_id,
  CASE 
    WHEN email = 'admin@airlast.demo' THEN 'admin'
    WHEN email = 'manager@airlast.demo' THEN 'manager'
    WHEN email = 'tech@airlast.demo' THEN 'tech'
  END as username,
  email,
  CASE 
    WHEN email = 'admin@airlast.demo' THEN 'Admin'
    WHEN email = 'manager@airlast.demo' THEN 'Manager'
    WHEN email = 'tech@airlast.demo' THEN 'Tech'
  END as first_name,
  'User' as last_name,
  CASE 
    WHEN email = 'admin@airlast.demo' THEN 'admin'
    WHEN email = 'manager@airlast.demo' THEN 'manager'
    WHEN email = 'tech@airlast.demo' THEN 'technician'
  END as role,
  'active' as status,
  ARRAY['HVAC', 'COOLING', 'HEATING', 'MAINTENANCE', 'REPAIR', 'INSTALLATION'] as services
FROM auth.users
WHERE email IN ('admin@airlast.demo', 'manager@airlast.demo', 'tech@airlast.demo');
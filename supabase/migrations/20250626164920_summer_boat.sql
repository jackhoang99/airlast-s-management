/*
  # Add auth_id mapping to users table

  1. Changes
    - Add `auth_id` column to `users` table if it doesn't exist
    - This column will store the Supabase Auth user ID to link users table records with auth.users

  2. Security
    - No RLS changes needed as this is just adding a column to existing table
*/

-- Add auth_id column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update existing users to link their auth_id based on email matching
DO $$
DECLARE
  user_record RECORD;
  auth_user_id uuid;
BEGIN
  FOR user_record IN SELECT id, email FROM users WHERE auth_id IS NULL LOOP
    -- Try to find matching auth user by email
    SELECT id INTO auth_user_id FROM auth.users WHERE email = user_record.email LIMIT 1;
    
    -- If found, update the user record
    IF auth_user_id IS NOT NULL THEN
      UPDATE users SET auth_id = auth_user_id WHERE id = user_record.id;
    END IF;
  END LOOP;
END $$;
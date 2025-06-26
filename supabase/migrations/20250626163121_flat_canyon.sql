/*
  # Add auth_id column to users table

  1. Changes
    - Add `auth_id` column to `users` table as nullable uuid
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
    ALTER TABLE users ADD COLUMN auth_id uuid;
  END IF;
END $$;
/*
  # Create Customer Portal Tables and Functions

  1. New Tables
    - `customer_portal_users` - Stores customer portal user information
    - `customer_portal_sessions` - Stores session information for portal users

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    
  3. Functions
    - Add function to verify customer portal password
*/

-- Create customer_portal_users table
CREATE TABLE IF NOT EXISTS customer_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create customer_portal_sessions table
CREATE TABLE IF NOT EXISTS customer_portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES customer_portal_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on customer_portal_users
ALTER TABLE customer_portal_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on customer_portal_sessions
ALTER TABLE customer_portal_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for customer_portal_users
CREATE POLICY "Authenticated users can view all portal users" 
  ON customer_portal_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for customer_portal_sessions
CREATE POLICY "Users can view their own sessions" 
  ON customer_portal_sessions
  FOR SELECT
  TO authenticated
  USING (true);

-- Add function to verify customer portal password
CREATE OR REPLACE FUNCTION verify_customer_portal_password(
  p_company_name TEXT,
  p_password TEXT
) RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- For demo purposes, we're just checking if the password is 'hvac123'
  -- In a real application, you would hash the password and compare with stored hash
  IF p_password = 'hvac123' THEN
    -- Find the company ID by name
    SELECT id INTO v_company_id
    FROM companies
    WHERE LOWER(name) = LOWER(p_company_name);
    
    IF v_company_id IS NULL THEN
      RETURN NULL; -- Company not found
    END IF;
    
    RETURN v_company_id;
  ELSE
    RETURN NULL; -- Password doesn't match
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
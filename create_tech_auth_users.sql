-- Create auth users for technicians who don't have auth_id
-- Run this in your Supabase SQL Editor

-- This function will create auth users for technicians without auth_id
CREATE OR REPLACE FUNCTION create_technician_auth_users()
RETURNS void AS $$
DECLARE
    tech_record RECORD;
    auth_user_id UUID;
BEGIN
    -- Loop through technicians without auth_id
    FOR tech_record IN 
        SELECT id, username, email, first_name, last_name 
        FROM users 
        WHERE role = 'technician' 
        AND auth_id IS NULL
    LOOP
        -- Create auth user using the correct Supabase auth function
        SELECT auth.users.id INTO auth_user_id
        FROM auth.users
        WHERE auth.users.email = tech_record.email;
        
        -- If auth user doesn't exist, we need to create it manually
        -- For now, just log that manual creation is needed
        IF auth_user_id IS NULL THEN
            RAISE NOTICE 'Manual auth user creation needed for: % (%)', tech_record.username, tech_record.email;
        ELSE
            -- Update the users table with the auth_id
            UPDATE users 
            SET auth_id = auth_user_id 
            WHERE id = tech_record.id;
            
            RAISE NOTICE 'Linked existing auth user for technician: % (%)', tech_record.username, tech_record.email;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to check and link existing auth users
SELECT create_technician_auth_users();

-- Clean up
DROP FUNCTION create_technician_auth_users(); 
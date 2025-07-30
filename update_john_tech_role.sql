-- Update john.tech role from 'user' to 'technician'
-- Run this in your Supabase SQL Editor

UPDATE users 
SET role = 'technician' 
WHERE username = 'john.tech';

-- Verify the update
SELECT 
    username,
    email,
    role,
    status
FROM users 
WHERE username = 'john.tech'; 
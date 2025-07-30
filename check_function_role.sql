-- Check what role the handle_new_user function was trying to set
-- Run this in your Supabase SQL Editor

-- First, let's see the full function definition to understand what role it was setting
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'handle_new_user';

-- Check what the default role should be for new users
SELECT 
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'role';

-- Check the current check constraint on the role column
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public'
AND constraint_name = 'users_role_check'; 
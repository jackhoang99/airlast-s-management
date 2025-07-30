-- Remove the handle_new_user function and its trigger that's causing automatic user creation
-- Run this in your Supabase SQL Editor

-- First, let's see the full function definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'handle_new_user';

-- Drop the trigger first (since it depends on the function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verify the trigger is gone
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users'
AND trigger_name = 'on_auth_user_created';

-- Verify the function is gone
SELECT 
    routine_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name = 'handle_new_user'; 
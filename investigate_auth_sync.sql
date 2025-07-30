-- Investigate why users are automatically added to public.users when created in auth.users
-- Run this in your Supabase SQL Editor

-- 1. Check for triggers on the auth.users table
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_schema,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' AND event_object_table = 'users';

-- 2. Check for functions that might sync auth.users to public.users
SELECT
    routine_schema,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
AND (routine_definition ILIKE '%auth.users%' OR routine_definition ILIKE '%public.users%')
AND routine_schema IN ('public', 'auth');

-- 3. Check for any functions that handle user creation events
SELECT
    routine_schema,
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
AND (routine_definition ILIKE '%handle_new_user%' 
     OR routine_definition ILIKE '%on_auth_user_created%'
     OR routine_definition ILIKE '%user_created%'
     OR routine_definition ILIKE '%auth_user_created%')
AND routine_schema IN ('public', 'auth');

-- 4. Check for any database event triggers
SELECT
    event_object_schema,
    event_object_table,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND action_statement ILIKE '%public.users%';

-- 5. Check for any functions in the extensions schema that might handle this
SELECT
    routine_schema,
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'extensions'
AND routine_definition ILIKE '%users%';

-- 6. Check if there are any Supabase-specific functions
SELECT
    routine_schema,
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%supabase%'
OR routine_name LIKE '%auth%'
OR routine_name LIKE '%user%';

-- 7. Check for any functions that might be called by default
SELECT
    routine_schema,
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%INSERT INTO public.users%'
OR routine_definition ILIKE '%INSERT INTO users%'; 
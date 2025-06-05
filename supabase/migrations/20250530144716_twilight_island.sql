-- Enable RLS on all tables and grant full access to authenticated users
DO $$
DECLARE
    r RECORD;
    tables_count INT := 0;
    policies_count INT := 0;
    policy_exists BOOLEAN;
BEGIN
    -- Loop through all tables in the public schema
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        -- Enable RLS on the table if not already enabled
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
        
        -- Check if the authenticated users policy already exists
        SELECT EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = r.tablename 
            AND policyname = 'Enable all access for authenticated users'
        ) INTO policy_exists;
        
        -- Create policy for authenticated users (full access) if it doesn't exist
        IF NOT policy_exists THEN
            EXECUTE format('CREATE POLICY "Enable all access for authenticated users" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', r.tablename);
            policies_count := policies_count + 1;
        END IF;
        
        -- Check if the public read policy already exists
        SELECT EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = r.tablename 
            AND policyname = 'Enable read access for all users'
        ) INTO policy_exists;
        
        -- Create policy for public users (read-only access) if it doesn't exist
        IF NOT policy_exists THEN
            EXECUTE format('CREATE POLICY "Enable read access for all users" ON public.%I FOR SELECT TO public USING (true)', r.tablename);
            policies_count := policies_count + 1;
        END IF;
        
        tables_count := tables_count + 1;
    END LOOP;
    
    RAISE NOTICE 'RLS enabled on % tables with % new policies created', tables_count, policies_count;
END
$$;
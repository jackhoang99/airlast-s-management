-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to upload permits" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view permits" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update permits" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete permits" ON storage.objects;

-- Create more permissive RLS policies for permits bucket
-- Allow authenticated users to upload files to permits bucket
CREATE POLICY "Allow authenticated users to upload permits" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'permits');

-- Allow authenticated users to view files in permits bucket
CREATE POLICY "Allow authenticated users to view permits" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'permits');

-- Allow authenticated users to update files in permits bucket
CREATE POLICY "Allow authenticated users to update permits" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'permits')
WITH CHECK (bucket_id = 'permits');

-- Allow authenticated users to delete files in permits bucket
CREATE POLICY "Allow authenticated users to delete permits" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'permits');

-- Also create policies for public access if needed
CREATE POLICY "Allow public to view permits" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'permits'); 
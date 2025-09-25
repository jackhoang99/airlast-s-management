-- Drop existing policies for document buckets
DROP POLICY IF EXISTS "Users can view location documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload location documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update location documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete location documents for their company" ON storage.objects;

DROP POLICY IF EXISTS "Users can view unit documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload unit documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update unit documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete unit documents for their company" ON storage.objects;

-- Create simpler, more permissive policies for location-documents bucket
CREATE POLICY "Authenticated users can view location documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'location-documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can upload location documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'location-documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update location documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'location-documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete location documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'location-documents' AND
        auth.role() = 'authenticated'
    );

-- Create simpler, more permissive policies for unit-documents bucket
CREATE POLICY "Authenticated users can view unit documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'unit-documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can upload unit documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'unit-documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can update unit documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'unit-documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can delete unit documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'unit-documents' AND
        auth.role() = 'authenticated'
    );

-- Create storage buckets for location and unit documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('location-documents', 'location-documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif', 'text/plain']),
    ('unit-documents', 'unit-documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for location-documents bucket
CREATE POLICY "Users can view location documents for their company" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'location-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM companies WHERE id IN (
                SELECT company_id FROM locations WHERE id = (storage.foldername(name))[2]::uuid
            )
        )
    );

CREATE POLICY "Users can upload location documents for their company" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'location-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM companies WHERE id IN (
                SELECT company_id FROM locations WHERE id = (storage.foldername(name))[2]::uuid
            )
        )
    );

CREATE POLICY "Users can update location documents for their company" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'location-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM companies WHERE id IN (
                SELECT company_id FROM locations WHERE id = (storage.foldername(name))[2]::uuid
            )
        )
    );

CREATE POLICY "Users can delete location documents for their company" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'location-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM companies WHERE id IN (
                SELECT company_id FROM locations WHERE id = (storage.foldername(name))[2]::uuid
            )
        )
    );

-- Create storage policies for unit-documents bucket
CREATE POLICY "Users can view unit documents for their company" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'unit-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM companies WHERE id IN (
                SELECT company_id FROM locations WHERE id IN (
                    SELECT location_id FROM units WHERE id = (storage.foldername(name))[2]::uuid
                )
            )
        )
    );

CREATE POLICY "Users can upload unit documents for their company" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'unit-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM companies WHERE id IN (
                SELECT company_id FROM locations WHERE id IN (
                    SELECT location_id FROM units WHERE id = (storage.foldername(name))[2]::uuid
                )
            )
        )
    );

CREATE POLICY "Users can update unit documents for their company" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'unit-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM companies WHERE id IN (
                SELECT company_id FROM locations WHERE id IN (
                    SELECT location_id FROM units WHERE id = (storage.foldername(name))[2]::uuid
                )
            )
        )
    );

CREATE POLICY "Users can delete unit documents for their company" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'unit-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT id::text FROM companies WHERE id IN (
                SELECT company_id FROM locations WHERE id IN (
                    SELECT location_id FROM units WHERE id = (storage.foldername(name))[2]::uuid
                )
            )
        )
    );

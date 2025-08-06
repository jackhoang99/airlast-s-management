-- Create invoices storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy for invoices bucket
CREATE POLICY "Invoices are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'invoices');

-- Allow authenticated users to upload invoices
CREATE POLICY "Users can upload invoices" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own invoices
CREATE POLICY "Users can update invoices" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own invoices
CREATE POLICY "Users can delete invoices" ON storage.objects
FOR DELETE USING (
  bucket_id = 'invoices' 
  AND auth.role() = 'authenticated'
); 
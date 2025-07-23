-- Create storage bucket for permits if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('permits', 'permits', true, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for permits bucket
-- Allow authenticated users to upload files to permits bucket
CREATE POLICY "Allow authenticated users to upload permits" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'permits' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to view files in permits bucket
CREATE POLICY "Allow authenticated users to view permits" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'permits');

-- Allow authenticated users to update their own files in permits bucket
CREATE POLICY "Allow authenticated users to update permits" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'permits' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'permits' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete their own files in permits bucket
CREATE POLICY "Allow authenticated users to delete permits" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'permits' AND auth.uid() IS NOT NULL); 
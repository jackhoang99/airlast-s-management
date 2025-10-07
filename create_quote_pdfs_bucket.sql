-- Create the quote-pdfs bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-pdfs', 'quote-pdfs', true)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public;

-- Create storage policies for the quote-pdfs bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload quote PDFs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'quote-pdfs');

-- Allow authenticated users to read files
CREATE POLICY "Allow authenticated users to read quote PDFs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'quote-pdfs');

-- Allow service role to upload files (for edge functions)
CREATE POLICY "Allow service role to upload quote PDFs" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'quote-pdfs');

-- Allow service role to read files (for edge functions)
CREATE POLICY "Allow service role to read quote PDFs" ON storage.objects
FOR SELECT TO service_role
USING (bucket_id = 'quote-pdfs');

-- Allow service role to delete files (for cleanup)
CREATE POLICY "Allow service role to delete quote PDFs" ON storage.objects
FOR DELETE TO service_role
USING (bucket_id = 'quote-pdfs');

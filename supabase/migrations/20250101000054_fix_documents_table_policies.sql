-- Drop existing RLS policies for document tables
DROP POLICY IF EXISTS "Users can view location documents for their company" ON location_documents;
DROP POLICY IF EXISTS "Users can insert location documents for their company" ON location_documents;
DROP POLICY IF EXISTS "Users can update location documents for their company" ON location_documents;
DROP POLICY IF EXISTS "Users can delete location documents for their company" ON location_documents;

DROP POLICY IF EXISTS "Users can view unit documents for their company" ON unit_documents;
DROP POLICY IF EXISTS "Users can insert unit documents for their company" ON unit_documents;
DROP POLICY IF EXISTS "Users can update unit documents for their company" ON unit_documents;
DROP POLICY IF EXISTS "Users can delete unit documents for their company" ON unit_documents;

-- Create simpler, more permissive policies for location_documents table
CREATE POLICY "Authenticated users can view location documents" ON location_documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert location documents" ON location_documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update location documents" ON location_documents
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete location documents" ON location_documents
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create simpler, more permissive policies for unit_documents table
CREATE POLICY "Authenticated users can view unit documents" ON unit_documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert unit documents" ON unit_documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update unit documents" ON unit_documents
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete unit documents" ON unit_documents
    FOR DELETE USING (auth.role() = 'authenticated');

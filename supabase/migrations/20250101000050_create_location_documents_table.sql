-- Create location_documents table
CREATE TABLE IF NOT EXISTS location_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_type TEXT,
    file_path TEXT,
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_location_documents_location_id ON location_documents(location_id);
CREATE INDEX IF NOT EXISTS idx_location_documents_company_id ON location_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_location_documents_status ON location_documents(status);
CREATE INDEX IF NOT EXISTS idx_location_documents_created_at ON location_documents(created_at);

-- Enable RLS
ALTER TABLE location_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view location documents for their company" ON location_documents
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies WHERE id = company_id
        )
    );

CREATE POLICY "Users can insert location documents for their company" ON location_documents
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT id FROM companies WHERE id = company_id
        )
    );

CREATE POLICY "Users can update location documents for their company" ON location_documents
    FOR UPDATE USING (
        company_id IN (
            SELECT id FROM companies WHERE id = company_id
        )
    );

CREATE POLICY "Users can delete location documents for their company" ON location_documents
    FOR DELETE USING (
        company_id IN (
            SELECT id FROM companies WHERE id = company_id
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_location_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_documents_updated_at
    BEFORE UPDATE ON location_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_location_documents_updated_at();

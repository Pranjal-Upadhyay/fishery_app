-- ============================================================================
-- Migration 054: Yojana Application Documents & Form Details
-- ============================================================================

-- Create Yojana Application Documents Table
CREATE TABLE IF NOT EXISTS application_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES yojana_applications(id) ON DELETE CASCADE,
    doc_type VARCHAR(80) NOT NULL, -- e.g., 'AADHAAR', 'CASTE_CERT', 'LAND_DEED', 'BANK_PASSBOOK', etc.
    file_path TEXT NOT NULL,       -- Supabase Storage path
    file_name TEXT NOT NULL,       -- Original file name
    mime_type VARCHAR(80),         -- e.g., 'application/pdf', 'image/jpeg'
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    rejection_reason TEXT,         -- Reason if verification fails
    verified_by_admin UUID,        -- Reference to admin (can map to admin_users table)
    verified_at TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (application_id, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_app_docs_application ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_app_docs_status ON application_documents(verification_status);

-- Alter Yojana Applications Table with Form Fields
ALTER TABLE yojana_applications
    ADD COLUMN IF NOT EXISTS applicant_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS applicant_district VARCHAR(100),
    ADD COLUMN IF NOT EXISTS applicant_category VARCHAR(20),
    ADD COLUMN IF NOT EXISTS applicant_land_area NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS project_description TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS form_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;

-- Conditionally add RLS policies on storage.objects if the schema and table exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'storage' AND table_name = 'objects'
    ) THEN
        -- Enable RLS if not already enabled on storage.objects (Supabase handles this usually, but let's be safe)
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist (to prevent duplicates)
        DROP POLICY IF EXISTS "farmers_own_folder" ON storage.objects;
        DROP POLICY IF EXISTS "admins_read_all" ON storage.objects;
        DROP POLICY IF EXISTS "farmers_read_own" ON storage.objects;

        -- Create policies
        EXECUTE 'CREATE POLICY "farmers_own_folder" ON storage.objects 
            FOR INSERT WITH CHECK (
                bucket_id = ''app-docs'' AND
                (storage.foldername(name))[1] = auth.uid()::text
            )';

        EXECUTE 'CREATE POLICY "admins_read_all" ON storage.objects 
            FOR SELECT USING (
                bucket_id = ''app-docs'' AND
                EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
            )';

        EXECUTE 'CREATE POLICY "farmers_read_own" ON storage.objects 
            FOR SELECT USING (
                bucket_id = ''app-docs'' AND
                (storage.foldername(name))[1] = auth.uid()::text
            )';
    END IF;
END $$;

-- ============================================================================
-- TRINETRA TASKS - STORAGE BUCKET & RLS POLICIES MIGRATION
-- ============================================================================

-- 1. Create a public storage bucket for task deliverables and files
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to prevent duplicate policy errors
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- 3. Enable read access for any authenticated users (or public) to download files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

-- 4. Enable insert access for authenticated users to upload files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

-- 5. Enable delete access for owners to delete their files
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments' AND auth.uid() = owner);

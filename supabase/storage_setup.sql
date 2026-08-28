-- ========================================================
-- storage_setup.sql
-- SUPABASE STORAGE BUCKETS & SECURITY POLICIES
-- ========================================================

-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('room-images', 'room-images', true),
    ('resort-assets', 'resort-assets', true),
    ('payment-slips', 'payment-slips', true),
    ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for room-images (Public Read, Admin Write)
CREATE POLICY "Public Access Room Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'room-images');

CREATE POLICY "Admin Upload Room Images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'room-images');

CREATE POLICY "Admin Delete Room Images"
ON storage.objects FOR DELETE
USING (bucket_id = 'room-images');

-- 3. Storage Policies for resort-assets (Public Read, Admin Write)
CREATE POLICY "Public Access Resort Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'resort-assets');

CREATE POLICY "Admin Upload Resort Assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'resort-assets');

-- 4. Storage Policies for payment-slips (Public Upload, Authorized Select)
CREATE POLICY "Public Upload Payment Slips"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-slips');

CREATE POLICY "View Payment Slips"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-slips');

-- 5. Storage Policies for documents (Vouchers, Receipts)
CREATE POLICY "Public View Documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "System Upload Documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

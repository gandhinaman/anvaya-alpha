
-- Create storage bucket for memory audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('memories', 'memories', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own memories"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'memories'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own memories
CREATE POLICY "Users can read their own memories"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'memories'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read for memory audio (so children can listen)
CREATE POLICY "Public can read memory audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'memories');

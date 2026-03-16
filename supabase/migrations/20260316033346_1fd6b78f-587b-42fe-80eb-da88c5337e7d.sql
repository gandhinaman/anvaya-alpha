-- Allow authenticated users to upload to their own folder in memories bucket
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'memories' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Allow authenticated users to update/overwrite their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'memories' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Allow anyone to read from the public memories bucket
CREATE POLICY "Public read access for memories"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'memories');
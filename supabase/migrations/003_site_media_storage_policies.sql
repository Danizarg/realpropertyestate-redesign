-- Storage RLS policies for the new `site-media` bucket (homepage cover
-- image/video). The bucket itself has already been created via the
-- Supabase Storage API with a public read setting and a 50MB file size
-- limit (see README.md — the project's global upload limit did not allow
-- 100MB, so 50MB is the effective cap for cover videos).
--
-- Run this once in the Supabase SQL Editor. Unlike supabase/schema.sql,
-- this only touches the new site-media bucket, so it's safe to run without
-- conflicting with the existing property-images policies.

create policy "Public read site media"
  on storage.objects for select
  using (bucket_id = 'site-media');

create policy "Authenticated upload site media"
  on storage.objects for insert
  with check (bucket_id = 'site-media' and auth.role() = 'authenticated');

create policy "Authenticated update site media"
  on storage.objects for update
  using (bucket_id = 'site-media' and auth.role() = 'authenticated');

create policy "Authenticated delete site media"
  on storage.objects for delete
  using (bucket_id = 'site-media' and auth.role() = 'authenticated');

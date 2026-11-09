-- Storage RLS policies for both buckets used by the site.
-- Run this in the Supabase SQL Editor after creating the buckets
-- (see README.md for bucket creation steps).
--
-- This file is for a FRESH project setup only. If property-images
-- policies already exist (as they do on this project), running the whole
-- file will error on duplicates — use supabase/migrations/003_site_media_
-- storage_policies.sql instead, which only adds the new site-media
-- policies.

-- ── property-images ──────────────────────────────────────────────────────
create policy "Public read property images"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "Authenticated upload property images"
  on storage.objects for insert
  with check (bucket_id = 'property-images' and auth.role() = 'authenticated');

create policy "Authenticated delete property images"
  on storage.objects for delete
  using (bucket_id = 'property-images' and auth.role() = 'authenticated');

-- ── site-media (homepage cover image/video) ──────────────────────────────
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

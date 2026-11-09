-- Adds the site_settings table used by the new "Homepage Cover" dashboard
-- feature. Run this once in the Supabase SQL Editor — it only adds new
-- objects, so it's safe to run even though supabase/schema.sql has already
-- been applied.

create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table site_settings enable row level security;

create policy "Public read site settings" on site_settings
  for select using (true);

create policy "Owner full access site settings" on site_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

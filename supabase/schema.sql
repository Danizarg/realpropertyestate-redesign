-- Properties table
create table properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text not null,
  slug text unique not null,
  short_description text not null,
  long_description text,
  price numeric,
  price_label text not null,
  location text not null,
  address text,
  bedrooms int,
  bathrooms numeric,
  internal_area text,
  plot_size text,
  outdoor_space text,
  property_type text,
  listing_type text,
  status text default 'Available',
  pets text,
  instagram_url text,
  tiktok_url text,
  features text[],
  published boolean default false,
  featured boolean default false
);

-- Property images
create table property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  url text not null,
  storage_path text not null,
  alt text,
  sort_order int default 0,
  is_cover boolean default false,
  created_at timestamptz default now()
);

-- Contact submissions
create table contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  phone text,
  interest text,
  property_id uuid references properties(id) on delete set null,
  message text not null
);

-- Site settings (key/value store for owner-editable site config, e.g. the
-- homepage hero cover image/video)
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- RLS policies
alter table properties enable row level security;
alter table property_images enable row level security;
alter table contact_submissions enable row level security;
alter table site_settings enable row level security;

-- Public can read published properties
create policy "Public read published properties" on properties
  for select using (published = true);

-- Public can read images of published properties
create policy "Public read property images" on property_images
  for select using (
    exists (select 1 from properties where id = property_id and published = true)
  );

-- Public can insert contact submissions
create policy "Public insert contact" on contact_submissions
  for insert with check (true);

-- Owner full access. Only one Supabase Auth user should ever exist (the owner),
-- so "authenticated" is equivalent to "owner" here. If you ever add more
-- authenticated users, replace auth.role() = 'authenticated' with an email
-- check against your OWNER_EMAIL, e.g.:
--   auth.jwt()->>'email' = 'owner@example.com'
create policy "Owner full access properties" on properties
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Owner full access images" on property_images
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Owner read contacts" on contact_submissions
  for select using (auth.role() = 'authenticated');

-- Public can read site settings (e.g. the homepage cover) so the public
-- homepage can render them
create policy "Public read site settings" on site_settings
  for select using (true);

-- Only the owner can change site settings
create policy "Owner full access site settings" on site_settings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

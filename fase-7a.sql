-- Fase 7A: Galeri & Testimoni dikelola admin. Jalankan di Supabase SQL Editor.
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  caption text not null check (char_length(caption) between 1 and 160),
  event_type text not null default 'lainnya' check (event_type in ('pernikahan','korporat','pabrik','ulang_tahun','lainnya')),
  location text check (location is null or char_length(location) <= 80),
  event_date date,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  role text check (role is null or char_length(role) <= 80),
  quote text not null check (char_length(quote) between 1 and 600),
  image_path text,
  event_type text check (event_type is null or event_type in ('pernikahan','korporat','pabrik','ulang_tahun','lainnya')),
  consent boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- testimoni hanya boleh tayang bila pelanggan sudah mengizinkan
  constraint testimonials_consent_before_publish check (not is_published or consent)
);

alter table public.gallery_items enable row level security;
alter table public.testimonials enable row level security;

-- Publik (anon) hanya melihat yang diterbitkan
drop policy if exists gallery_public_read on public.gallery_items;
create policy gallery_public_read on public.gallery_items for select to anon, authenticated using (is_published);
drop policy if exists testimonials_public_read on public.testimonials;
create policy testimonials_public_read on public.testimonials for select to anon, authenticated using (is_published);

-- Admin: baca semua + tulis
drop policy if exists gallery_admin_all on public.gallery_items;
create policy gallery_admin_all on public.gallery_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists testimonials_admin_all on public.testimonials;
create policy testimonials_admin_all on public.testimonials for all to authenticated using (public.is_admin()) with check (public.is_admin());

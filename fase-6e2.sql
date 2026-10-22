-- Fase 6E-2: Pengaturan Toko (satu baris). Jalankan di Supabase SQL Editor.
create table if not exists public.store_settings (
  id smallint primary key default 1 check (id = 1),
  wa_number text not null default '6282292247395' check (wa_number ~ '^62[0-9]{8,13}$'),
  fuel_rate_pickup integer not null default 1000 check (fuel_rate_pickup between 0 and 100000),
  fuel_rate_truck integer not null default 975 check (fuel_rate_truck between 0 and 100000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

alter table public.store_settings enable row level security;

-- Admin boleh membaca; publik membaca lewat server (service role), jadi tanpa policy anon.
drop policy if exists store_settings_select on public.store_settings;
create policy store_settings_select on public.store_settings
  for select to authenticated using (public.is_admin());

-- Hanya owner yang boleh mengubah
drop policy if exists store_settings_update on public.store_settings;
create policy store_settings_update on public.store_settings
  for update to authenticated
  using (exists (select 1 from public.admins a where a.id = auth.uid() and a.role = 'owner'))
  with check (exists (select 1 from public.admins a where a.id = auth.uid() and a.role = 'owner'));

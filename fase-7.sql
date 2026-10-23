-- Fase 7: sinkron Google Calendar (satu arah). Jalankan di Supabase SQL Editor.
create table if not exists public.calendar_sync (
  order_id uuid primary key references public.orders(id) on delete cascade,
  event_id text,
  kind text check (kind in ('setup','sales_delivery','store_pickup')),
  status text not null default 'pending' check (status in ('synced','pending','failed','removed')),
  last_error text,
  synced_at timestamptz,
  failure_notified_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Hanya diakses server (service role). Admin boleh melihat status sinkron.
alter table public.calendar_sync enable row level security;
drop policy if exists calendar_sync_admin_read on public.calendar_sync;
create policy calendar_sync_admin_read on public.calendar_sync for select to authenticated using (public.is_admin());

-- Fase 9A: jenis acara pada pesanan. Jalankan di Supabase SQL Editor (aman diulang).
alter table public.orders
  add column if not exists event_type text
  check (event_type is null or event_type in ('pernikahan','korporat','pabrik','ulang_tahun','lainnya'));

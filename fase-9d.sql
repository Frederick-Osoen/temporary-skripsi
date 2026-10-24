-- Fase 9D. Jalankan di Supabase SQL Editor (aman dijalankan ulang).

-- 1) Event "Bongkar" di Google Calendar: satu pesanan sewa kini punya dua event (pasang + bongkar)
alter table public.calendar_sync add column if not exists teardown_event_id text;

-- 2) Pengaturan toko yang bisa diubah owner dari dashboard
alter table public.store_settings add column if not exists store_phone text not null default '';
alter table public.store_settings add column if not exists opening_hours text not null default '';
alter table public.store_settings add column if not exists notify_emails text not null default '';

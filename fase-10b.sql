-- Fase 10B. Event "Acara" (Hari-H sampai hari selesai) di Google Calendar. Aman dijalankan ulang.
alter table public.calendar_sync add column if not exists acara_event_id text;

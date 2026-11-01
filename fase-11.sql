-- Fase 11: kode referensi lead, penilaian keseriusan, arsip otomatis.
-- Jalankan di Supabase SQL Editor (aman diulang).
alter table public.leads add column if not exists ref_code text;
alter table public.leads add column if not exists seriousness text;
alter table public.leads add column if not exists auto_archived_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_seriousness_check') then
    alter table public.leads add constraint leads_seriousness_check
      check (seriousness is null or seriousness in ('serious', 'maybe', 'not_serious'));
  end if;
end $$;

-- Satu kode = satu lead (lead lama tanpa kode tidak terkena)
create unique index if not exists leads_ref_code_key on public.leads (ref_code) where ref_code is not null;
create index if not exists leads_status_created_idx on public.leads (status, created_at);

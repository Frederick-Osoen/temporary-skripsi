-- Fase 9E. Jalankan di Supabase SQL Editor (aman dijalankan ulang). Jalankan fase-9d.sql lebih dulu.

-- 1) Kontak publik fleksibel (kosong = tidak tampil di situs)
alter table public.store_settings add column if not exists contact_email text not null default '';
alter table public.store_settings add column if not exists instagram_url text not null default '';
alter table public.store_settings add column if not exists tiktok_url text not null default '';

-- 2) Jam buka sesuai client (hanya diisi bila masih kosong; tidak menimpa yang sudah Anda ubah)
update public.store_settings
   set opening_hours = E'Senin–Sabtu: 08.00–16.00\nMinggu: libur'
 where id = 1 and coalesce(opening_hours, '') = '';

-- 3) OPSIONAL: tarif overtime genset per jam menurut kapasitas (konfirmasi client 2026-10-27).
--    Anda bilang akan mengedit manual di Supabase, jadi blok ini boleh dilewati.
--    Hanya mengubah produk yang capacity_kva-nya persis cocok. Genset di bawah 30 kVA tidak disentuh.
-- update public.products p set overtime_rate = v.rate
--   from (values (30,100000),(60,200000),(80,300000),(100,350000),(150,500000),(200,700000),(250,850000)) as v(kva, rate)
--  where p.capacity_kva = v.kva;

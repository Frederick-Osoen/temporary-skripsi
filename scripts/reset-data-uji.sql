-- RESET DATA UJI sebelum serah terima. Jalankan di Supabase SQL Editor, BAGIAN DEMI BAGIAN.
-- Yang DIHAPUS : pesanan & isinya, jadwal, alokasi unit, pembayaran, riwayat status, sinkron kalender,
--                pelanggan, lead, log perawatan, rate limit.
-- Yang DIPERTAHANKAN: products, unit_assets, genset_rules, store_settings, admins, gallery_items,
--                testimonials, route_cache (cache jarak aman dipakai terus).
-- Opsional (lihat langkah 3): api_call_log. EKSPOR DULU sebagai bukti skripsi, baru hapus.

-- ===== LANGKAH 1: pratinjau (hanya membaca) =====
select 'orders' t, count(*) from orders union all
select 'order_items', count(*) from order_items union all
select 'order_schedules', count(*) from order_schedules union all
select 'order_status_history', count(*) from order_status_history union all
select 'payment_transactions', count(*) from payment_transactions union all
select 'asset_assignments', count(*) from asset_assignments union all
select 'calendar_sync', count(*) from calendar_sync union all
select 'customers', count(*) from customers union all
select 'leads', count(*) from leads union all
select 'maintenance_logs', count(*) from maintenance_logs union all
select 'api_call_log', count(*) from api_call_log;

-- Cek juga: apakah ada sequence/counter untuk kode pesanan?
select sequencename, last_value from pg_sequences where schemaname = 'public';

-- ===== LANGKAH 2: hapus data transaksi (satu transaksi; bila ada error, tidak ada yang terhapus) =====
begin;
truncate table
  asset_assignments, calendar_sync, order_items, order_schedules, order_status_history,
  payment_transactions, orders, customers, leads, maintenance_logs, rate_limits
restart identity;
commit;

-- Kembalikan status unit aset yang sempat diubah saat uji (periksa dulu kolomnya di Table Editor):
-- select id, status from unit_assets where status <> 'available';   -- sesuaikan nama kolom/nilai dengan skema Anda

-- ===== LANGKAH 3 (opsional): bersihkan log API setelah dieksport & discreenshot =====
-- truncate table api_call_log restart identity;

-- ===== LANGKAH 4: cek hasil =====
-- Buat satu pesanan percobaan dari dashboard dan pastikan kode pesanan mulai dari awal, lalu hapus lagi dengan langkah 2.
-- Yang TIDAK ikut terhapus oleh SQL ini dan harus dibereskan manual:
--   * Event uji di Google Calendar (hapus dari aplikasi Google Calendar)
--   * Akun admin uji di Authentication > Users (dan baris di tabel admins)
--   * Foto uji di Storage (bucket product-images dan galeri)
--   * Produk / unit / testimoni / galeri contoh yang bukan milik klien

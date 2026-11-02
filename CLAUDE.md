# JJ Teknik: sistem skripsi (Frederick, Petra, C14220269)

Estimator biaya + penjadwalan untuk JJ Teknik (sewa AC/genset, spareparts, Pandaan).
Situs publik (estimator, lead lewat WhatsApp click-to-chat) + dashboard admin + PWA admin.
Produksi: jjteknik.id (publik), admin.jjteknik.id (dashboard). Buku TA jatuh tempo 12 Nov 2026
(batas 12.000 kata Bab 1-5). Tipe TA "Proyek": janji di proposal HARUS terwujud di kode.

## Stack
Next.js 16.4.3 (App Router, proxy.ts), Tailwind v4, shadcn, Supabase (Seoul, nano; RLS + RPC + Auth),
Zod 4.6.7, Vercel Hobby (Seoul), Google Routes/Places/Calendar, Resend.
Versi Next dan zod sengaja di-pin setelah audit keamanan; jangan upgrade tanpa diminta.

## Perintah
npm run dev | npx tsc --noEmit | npm run lint | npm run build
Sebelum bilang "selesai": tsc + lint + build harus lolos.

## Git (PENTING)
- origin = temporary-skripsi (branch dev = tempat kerja). prod = repo yang men-deploy produksi (main).
- JANGAN git push tanpa diminta, JANGAN menyentuh main/prod. Kerja di branch fitur (fix/..., fitur/...).
- Perubahan DB selalu lewat file baru fase-N.sql (user menjalankannya manual di Supabase SQL Editor).
  Sertakan skrip rollback. Jangan menimpa fase lama. Kolom baru default aman (jangan mengunci siapa pun).
- Jangan baca/cetak .env.local atau kunci apa pun.

## Arsitektur penting
- src/proxy.ts: routing berbasis host (admin.jjteknik.id hanya melayani area admin).
- Auth: src/lib/auth.ts (requireAdmin/requireAdminProfile/requireOwner); sesi dicek lokal lewat getClaims()
  (JWT expiry diset 10 menit, hanya berlaku untuk token BARU). Hak admin dijaga RLS (fungsi is_admin) + RPC.
- Admin: halaman force-dynamic. Publik: ISR/statis. staleTimes.dynamic = 30.
- Ongkir: src/app/api/distance/route.ts (Google Routes API v2, cache di route_cache, rate limit via RPC check_rate_limit,
  retry sampai 3 percobaan, fallback bertingkat). Saran alamat: /api/places/autocomplete (debounce 500 ms).
- Pesanan/kalender dijalankan lewat Server Actions + RPC (BUKAN /api/orders atau /api/calendar).
- Leads: kode referensi JJ-XXXXX, seriousness, auto-archive 7 hari (cron harian), AutoRefresh 30 detik.

## Keputusan yang SUDAH diambil (jangan diusulkan ulang)
- Auto-refresh 30 detik, bukan Supabase Realtime (juga untuk stok: availability/maintenance cukup AutoRefresh).
- Dashboard: dashboard/loading.tsx tetap "Loading..."; JANGAN pasang skeleton di admin.
- Animasi hanya di halaman publik; dashboard tidak disentuh.
- Estimasi publik tidak punya input jarak manual; saat Google gagal tampil "ongkir dihitung admin".
  Admin bisa mengisi ongkir manual (manual_shipping_fee).

## Pekerjaan yang direncanakan (urutan)
Paket 1: admin nonaktif harus langsung kehilangan akses.
  Temuan: setAdminActive (src/app/dashboard/admins/actions.ts) hanya memberi ban_duration; requireAdminProfile
  hanya mengecek baris admins ada. Rencana: admins.is_active (default true) lewat fase-12.sql, hapus sesi user,
  requireAdminProfile ikut membaca is_active, is_admin() RLS ikut cek is_active, plus rollback.
  Risiko: jangan sampai owner terkunci; owner tidak boleh menonaktifkan diri sendiri (loadTarget sudah menolak).
Paket 2: pinpoint peta yang bisa digeser + visualisasi rute (janji proposal 4.4).
  Kunci browser TERPISAH (Maps JS saja, referrer jjteknik.id/* dan localhost:3000/*); kunci server
  (Routes, Places New, Geocoding) tidak boleh dipakai di browser. Reverse geocode lewat /api/geocode/reverse
  (server, rate limit, hanya saat marker dilepas). Peta dimuat setelah diklik. Tambah polyline di field mask Routes
  dan kolom polyline di route_cache. Cache koordinat dibulatkan ~110 m.
Paket 3: Framer Motion ringan (LazyMotion, hanya opacity/transform, once, reducedMotion="user", transisi masuk
  lewat template.tsx); skeleton hanya di kartu ongkir estimator, saran alamat, kotak peta (muncul bila > 300 ms);
  AutoRefresh di availability dan maintenance. Cek ukuran bundle dan Lighthouse sebelum/sesudah.
Teks buku yang diubah (bukan kode): Distance Matrix -> Routes API; /api/orders & /api/calendar -> Server Actions;
  PgBouncer -> koneksi dikelola Supabase Data API (tidak ada koneksi Postgres langsung); out-of-scope pembayaran
  -> "pencatatan pembayaran manual, bukan payment gateway"; Realtime Stock Monitor -> pembaruan otomatis 30 detik.

## Cara bekerja dengan Frederick
- Bahasa Indonesia, santai tapi profesional, seperti rekan engineer yang ramah. Analogi sederhana 1-2 kalimat
  sebelum konsep teknis. Pisahkan: Apa masalahnya / Apa solusinya / Langkah selanjutnya.
- Tetap detail: nama file spesifik, daftar, analisis risiko tajam.
- Jujur: tandai apa yang sudah diverifikasi vs belum. Jangan menebak. Katakan kalau tidak yakin.
- Gunakan Plan mode untuk paket besar; user memakai mode Manual (setiap edit minta izin).

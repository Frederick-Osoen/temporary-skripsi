# Checklist Deploy JJ Teknik (Vercel + jjteknik.id)

## 0. Cek dulu (bisa menggagalkan semuanya)
- [ ] **GitHub `jjteknik` itu akun pribadi atau Organization?** Vercel **Hobby tidak bisa deploy repo privat milik Organization** (hanya repo publik). Pilihan: (a) repo di akun pribadi, (b) Vercel Pro, (c) repo publik (jangan: ada logika bisnis dan skema). Akun pribadi = aman di Hobby.
- [ ] Vercel Hobby = pemakaian non-komersial menurut ketentuannya. Untuk skripsi tidak masalah; untuk bisnis berjalan jangka panjang tulis di Bab 5 sebagai saran (Pro).
- [ ] Repo di GitHub klien **privat**. `.env*` tidak ikut ter-commit (sudah di `.gitignore`; riwayat sudah dicek, tidak ada kunci asli).

## 1. Database
- [ ] Supabase SQL Editor: jalankan `fase-10a.sql` lalu `fase-10b.sql` (aman diulang). Pastikan `fase-9d.sql` dan `fase-9e.sql` sudah pernah dijalankan.

## 2. Git: dua remote dari satu folder (jangan clone dua kali)
```
git remote add jj https://github.com/jjteknik/web-jjteknik.git
git push jj fase-6c-leads-storage:main        # saat sudah matang; origin tetap untuk kerja harian
```
Jangan commit langsung di repo `jj` lewat web GitHub, supaya riwayat tidak bercabang.

## 3. Vercel
- [ ] Login Vercel dengan akun jjteknik -> Add New Project -> pilih `web-jjteknik`. Framework Next.js otomatis.
- [ ] Settings -> Functions -> Region: **Seoul (icn1)** (database Supabase di Seoul).
- [ ] Settings -> Environment Variables (tabel di bawah) untuk Production. Lalu Deploy.

| Variabel | Wajib | Rahasia | Catatan |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ya | tidak | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ya | tidak | |
| `SUPABASE_SERVICE_ROLE_KEY` | ya | **ya** | jangan pernah diberi awalan NEXT_PUBLIC |
| `NEXT_PUBLIC_SITE_URL` | ya | tidak | `https://jjteknik.id` (tertanam saat build: ubah = redeploy) |
| `GOOGLE_MAPS_API_KEY` | ya | **ya** | batasi ke Routes + Places API, kuota harian, budget alert |
| `WAREHOUSE_ADDRESS` | ya | tidak | titik asal hitung jarak |
| `CRON_SECRET` | ya | **ya** | acak >= 32 karakter; Vercel mengirimnya otomatis ke cron |
| `OWNER_EMAIL` | ya | tidak | penerima audit |
| `RESEND_API_KEY` | ya | **ya** | |
| `RESEND_FROM` | ya | tidak | `JJ Teknik <notifikasi@jjteknik.id>` setelah domain terverifikasi |
| `GOOGLE_CALENDAR_ID` | ya | tidak | |
| `GOOGLE_CALENDAR_CLIENT_EMAIL` | ya | tidak | service account **baru** |
| `GOOGLE_CALENDAR_PRIVATE_KEY` | ya | **ya** | key **baru** (yang lama sudah bocor); satu baris, `\n` tetap ditulis `\n` |
| `NOTIFY_EMAILS` | tidak | tidak | cadangan; utamanya diatur di Dashboard > Pengaturan |
| `NEXT_PUBLIC_WA_NUMBER` | tidak | tidak | cadangan; utamanya di Pengaturan |
| `GOOGLE_TOLL_PASSES`, `TOLL_FALLBACK_PER_KM`, `TRUCK_TOLL_MULTIPLIER` | tidak | tidak | bawaan sudah wajar |
| `ALLOW_LOCAL_IMAGE_IP`, `DEBUG_TOLL` | **JANGAN diset** | | hanya untuk lokal |

## 4. Domain jjteknik.id (Hostinger)
- [ ] Vercel -> Project -> Settings -> Domains -> tambah `jjteknik.id` dan `www.jjteknik.id` (www dialihkan ke apex atau sebaliknya).
- [ ] Hostinger hPanel -> Domains -> DNS Zone: hapus record A/AAAA/CNAME bawaan (parkir) yang bentrok, tambah **persis** record yang ditampilkan Vercel.
- [ ] Tunggu status Valid + SSL (menit sampai beberapa jam). Cek email Hostinger: domain `.id` bisa minta verifikasi identitas pemilik.
- [ ] Setelah domain aktif: pastikan `NEXT_PUBLIC_SITE_URL` benar -> **Redeploy**.

## 5. Supabase Auth
- [ ] Authentication -> URL Configuration: Site URL `https://jjteknik.id`; Redirect URLs: `https://jjteknik.id/**`, `https://*.vercel.app/**` (preview), `http://localhost:3000/**`.

## 6. Resend (email)
- [ ] Resend -> Domains -> tambah `jjteknik.id` -> salin record SPF/DKIM ke DNS Zone Hostinger -> Verify. Baru isi `RESEND_FROM`, redeploy.
- [ ] Dashboard > Pengaturan > Penerima email: isi semua email; tombol uji notifikasi.

## 7. Google Cloud
- [ ] API key: batasi API (Routes, Places), kuota harian, budget alert. Screenshot untuk Bab 4.
- [ ] Service account baru + key baru; hapus key lama. Bagikan Google Calendar ke service account (izin "Make changes to events").

## 8. Smoke test (urut)
1. `/`, `/katalog`, `/kalkulator` (tenda 400 m² = 30), `/artikel/cara-menghitung-kebutuhan-btu-ac`: foto tampil.
2. `/estimasi`: cari alamat, jarak dan ongkir muncul, kirim ke WhatsApp, lead masuk dashboard.
3. Login admin; buat pesanan sewa; alokasi unit; catat DP.
4. Google Calendar: muncul **Setup (biru), Acara (hijau), Bongkar (abu)**.
5. Dashboard > Pengaturan: Aturan genset bisa disimpan.
6. Vercel -> Settings -> Cron Jobs -> **Run** `keepalive` dan `daily`; cek Logs (harus 200). Tanpa secret = 401.
7. HP: buka `https://jjteknik.id`, Install app (Android) / Add to Home Screen (iOS); matikan jaringan -> halaman offline muncul.

## 9. Setelah semua beres
- [ ] Jalankan kit pengujian (`docs/pengujian/README.md`) terhadap `https://jjteknik.id`.
- [ ] Sebelum serah terima: `scripts/reset-data-uji.sql` (ekspor `api_call_log` dulu).

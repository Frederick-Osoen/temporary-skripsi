# Fase 7: setup email (Resend) + Google Calendar

## 1. SQL
Jalankan `fase-7.sql` di Supabase SQL Editor (membuat tabel `calendar_sync`).

## 2. Isi `.env.local` (lalu restart `npm run dev`)

```dotenv
# Resend
RESEND_API_KEY=re_xxx
# Tanpa domain terverifikasi, Resend HANYA mengizinkan pengirim ini dan penerima = email akun Resend Anda.
RESEND_FROM=JJ Teknik <onboarding@resend.dev>
OWNER_EMAIL=email-owner@gmail.com            # penerima audit (batal / buka kunci / ubah pembayaran)
NOTIFY_EMAILS=admin1@gmail.com,admin2@gmail.com  # opsional: lead baru, ringkasan harian, kegagalan (owner otomatis ikut)

# Google Calendar (dari file JSON service account)
GOOGLE_CALENDAR_CLIENT_EMAIL=bot-kalender-jjteknik@project-....iam.gserviceaccount.com   # field client_email
GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"        # field private_key, satu baris, \n tetap ditulis \n
GOOGLE_CALENDAR_ID=xxxx@group.calendar.google.com   # Google Calendar > Settings > Integrate calendar > Calendar ID

# Cron (juga dipakai keep-alive)
CRON_SECRET=string-acak-panjang
NEXT_PUBLIC_SITE_URL=https://domain-anda.com   # untuk tautan di email dan deskripsi event
```

Variabel yang kosong = fitur itu dilewati diam-diam (tidak error).

## 3. Bagikan kalender ke bot
Google Calendar > pilih kalender > Settings and sharing > Share with specific people > tambahkan
`client_email` service account > izin **Make changes to events**.
Pastikan Google Calendar API sudah di-Enable di project Google Cloud.

## 4. Warna event
| Warna | Arti | Tanggal event |
|---|---|---|
| Biru | Setup (pesanan ada sewa) | H-1 (setup_date) |
| Oranye | Pengiriman sparepart | start_date |
| Kuning | Ambil di toko | start_date |

Pesanan dibatalkan = event dihapus. Event dibuat/diubah otomatis saat pesanan dibuat, diedit, status berubah, atau diperpanjang.

## 5. Email yang dikirim
- Lead baru dari situs publik (ops)
- Ringkasan H-1/H-2 tiap pagi 06:00 WIB (ops), lewat cron `/api/cron/daily`
- Audit ke owner: pembatalan, buka kunci (override), ubah/hapus pembayaran
- Kegagalan sinkron kalender (ops, maksimal sekali per 6 jam per pesanan)

## 6. Uji cepat
- Buat pesanan sewa baru dan cek kalender (event biru di tanggal setup).
- Batalkan pesanan dan cek: event hilang + email audit ke OWNER_EMAIL.
- Cron manual: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily`

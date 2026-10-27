# Peta: "Mau ubah apa, buka mana?"

Satu halaman untuk menjawab pertanyaan itu. Tidak ada kode yang berubah karena file ini.

## Trik nomor 1: cari kalimatnya

Di VS Code tekan **Ctrl+Shift+F**, ketik potongan kalimat yang tampil di situs
(contoh: `sempat berhenti`), lalu buka hasilnya. Ini lebih cepat daripada menelusuri import.
Kalau kalimatnya tidak ketemu di kode, berarti ia datang dari database (lihat bagian A).

## Tiga tempat data

| Tempat | Isinya | Cara mengubah | Perlu deploy? |
|---|---|---|---|
| **A. Database (lewat dashboard)** | Hal yang diurus pemilik toko | Buka dashboard, edit, simpan | Tidak |
| **B. File kode** | Teks dan fakta yang jarang berubah | Edit file, simpan, commit | Ya |
| **C. `.env.local`** | Rahasia (kunci API, dll) | Edit `.env.local` / env di Vercel | Ya |

## A. Diubah lewat dashboard (tidak perlu menyentuh kode)

| Mau ubah | Buka di dashboard |
|---|---|
| Nomor WhatsApp, telepon, **jam buka**, email kontak, **Instagram, TikTok**, tarif BBM, penerima email notifikasi | **Pengaturan** (hanya owner) |
| Harga sewa/jual, kapasitas kVA, **tarif overtime genset**, stok, foto produk | **Produk** |
| Foto galeri | **Galeri** |
| Testimoni | **Testimoni** |
| Admin lain | **Kelola Admin** |

Aturan genset (berapa AC butuh berapa kVA) ada di tabel `genset_rules`; ubah langsung di Supabase → Table Editor.

## B. Diubah lewat file kode

| Mau ubah | File |
|---|---|
| Tahun buka/buka kembali, alamat, radius gratis ongkir, armada, tagline, link Maps | `src/lib/public/business.ts` |
| Redaksi garansi | `src/lib/public/business.ts` (blok `GUARANTEE`) |
| Daftar FAQ | `src/lib/public/faq.ts` |
| Artikel | `src/content/articles.tsx` (satu blok `{ slug, title, ... }` per artikel) |
| Foto dan nama tim | `src/lib/public/team.ts` (petunjuknya ada di komentar file itu) |
| Paragraf dan judul halaman **Tentang** | `src/app/(public)/tentang/page.tsx` |
| Judul besar dan teks **Beranda** | `src/app/(public)/page.tsx` |
| Teks halaman **Kontak** | `src/app/(public)/kontak/page.tsx` |
| Teks penutup dan kolom link **footer** | `src/components/public/site-footer.tsx` |
| Menu navbar | `src/components/public/site-header.tsx` (daftar `NAV`) |
| Rumus kalkulator kebutuhan AC | `src/lib/public/needs.ts` |
| Batas muat pickup/truk | `src/lib/public/fleet.ts` |
| Jatah jam genset standar (8 jam) | `src/lib/orders/schedule.ts` (`STANDARD_HOURS`) |
| Peringatan refund | `src/lib/orders/status.ts` |

Catatan saat mengedit teks di file `page.tsx`: jangan ketik tanda `{ }` atau `< >` di dalam kalimat.
Tanda `{BUSINESS.founded}` hanyalah angka yang ditempel dari `business.ts`; boleh diganti teks biasa.

## C. Rahasia (`.env.local`)

Kunci Supabase, Resend, Google Calendar, `CRON_SECRET`, URL situs. Jangan pernah di-commit.

## Satu perkara yang masih bercampur

Baris "di Jawa Timur" di judul Beranda belum diganti ke "Jawa, Bali, dan Lombok" (ada di
`src/app/(public)/page.tsx`, cari `untuk acara dan industri di`).

## Alur pesanan (yang memang berlapis)

Hanya untuk pesanan dan pembayaran, urutannya: **tampilan → `actions.ts` → fungsi database (RPC)**.
Lapisan ini sengaja ada supaya uang dan stok tidak bisa rusak. Untuk teks biasa, abaikan saja.

# DESIGN.md — Panduan Desain JJ Teknik

Dokumen ini adalah **kontrak** untuk siapa pun (manusia atau AI) yang mengerjakan tampilan. Baca seluruhnya sebelum mengubah file.

## 1. Konsep

**"Dingin dan bertenaga."** JJ Teknik menyewakan AC (dingin) dan genset (listrik). Kesannya: profesional untuk klien korporat (B2B), tapi hangat dan mudah dipakai orang awam. Elegan dan menarik perhatian, bukan norak, bukan kosong.

Prinsip UX yang tidak boleh dilanggar:
1. **Mobile-first.** Rancang di lebar 360 px dulu, baru perlebar.
2. **Bukan toko online.** Tidak ada checkout atau pembayaran. Ujung alurnya selalu tombol *Lanjutkan via WhatsApp*. Hasil hitungan adalah **estimasi**, bukan harga final.
3. **Publik tidak boleh tahu stok.** Jangan pernah menampilkan jumlah unit, "tersisa N", "stok habis", atau status ketersediaan. Pelanggan cukup merasa barangnya selalu ada dan bisa diandalkan.
4. **Fitur nyata, bukan gimmick.** Animasi harus membantu pemahaman (urutan, perubahan status, perhatian), bukan hiasan yang memperlambat.

## 2. Token (sumber kebenaran: `src/app/globals.css`)

Semua warna, radius, dan bayangan berasal dari variabel CSS. **Dilarang** menulis hex/rgb langsung di komponen; pakai kelas token.

| Peran | Token / kelas Tailwind | Nilai |
|---|---|---|
| Navy (heading, latar gelap) | `text-ink`, `bg-ink` | `#0B1B33` |
| Primary "Frost" | `bg-primary`, `text-primary` | `#0E7490` |
| Aksen "Volt" (CTA utama, genset) | `bg-volt text-volt-foreground`, `Button variant="accent"` | `#F59E0B` |
| Permukaan | `bg-background`, `bg-muted` | `#FFFFFF`, `#F1F6FA` |
| Teks sekunder | `text-muted-foreground` | `#52667A` |
| Border | `border-border` | `#D9E4EC` |
| Sukses / peringatan / bahaya | `text-success`, `text-warning`, `text-destructive` | hijau / oranye tua / merah |

Aturan pemakaian warna:
- Satu CTA amber (`variant="accent"`) per layar. Aksi lain memakai `default` (teal) atau `outline`.
- Kontras teks minimal 4.5:1 (target Lighthouse Accessibility ≥ 85). Jangan menaruh teks `muted-foreground` di atas gradien.
- Mengganti palet = mengubah `:root` di `globals.css`. Tidak perlu menyentuh komponen.

Utilitas siap pakai (di `globals.css`): `.bg-hero`, `.text-gradient`, `.card-lift`, `.skeleton`, `.animate-float`.

Tipografi: heading memakai **Plus Jakarta Sans** (`--font-jakarta`, otomatis lewat `h1–h4`), isi memakai **Inter**. Jangan menambah font baru.

## 3. Animasi: murah dan ringan

- Hanya animasikan `transform` dan `opacity`. Jangan animasikan `width/height/top/left`.
- Pakai CSS (utilitas di atas) atau `FadeIn` dari `components/public/motion.tsx` (framer-motion `LazyMotion`, sudah ada). **Dilarang** menambah library animasi, Lottie, WebGL, atau partikel.
- Hero (di atas lipatan layar) **tanpa animasi masuk**, supaya LCP cepat. Animasi masuk hanya untuk bagian di bawah lipatan, sekali saja.
- Durasi 150–400 ms, easing `ease-out`. Semua animasi otomatis dimatikan oleh `prefers-reduced-motion` (sudah diatur global).
- Loading data memakai `.skeleton`, bukan spinner kosong.

## 4. Anggaran performa

- JS halaman publik: jangan menambah dependensi baru tanpa alasan kuat. Cek ukuran dengan `npm run build`.
- Gambar produk lewat `next/image` dengan `sizes` yang benar. Foto sudah dikompres WebP saat upload.
- Target Lighthouse (mobile): Performance ≥ 85, Accessibility ≥ 85, Best Practices ≥ 85, SEO ≥ 85.
- Semua gambar punya `alt`; elemen interaktif punya label dan fokus yang terlihat; area sentuh ≥ 40 px.

## 5. Batas wilayah file (PENTING)

**Boleh diubah bebas (tampilan publik):**
- `src/app/(public)/**` (halaman beranda, katalog, estimasi)
- `src/components/public/**` (header, footer, kartu produk, `estimator.tsx`, `cart-bar.tsx`, dst.)
- `src/app/not-found.tsx`
- `src/app/globals.css` (token dan utilitas)

**Jangan diubah (logika dan data):**
- `src/lib/public/use-estimator.ts` — seluruh logika estimator (state, hitungan, validasi, ongkir, pencatatan lead). `estimator.tsx` hanya memanggil hook ini dan merender hasilnya. Jika UI butuh data baru, **tambahkan** ke nilai yang dikembalikan hook, jangan mengubah perhitungan yang ada.
- `src/lib/public/{estimate,fleet,genset,whatsapp,cart,leads-client,products,types}.ts`
- `src/app/api/**`, `src/lib/supabase/**`, `src/lib/validations/**`
- Seluruh `src/app/dashboard/**` dan `src/components/dashboard/**`

Perilaku yang harus dipertahankan di estimator:
- Jam mulai/selesai **kosong** secara default dan **wajib** bila ada genset.
- Pembelian + sewa dalam satu pesanan menampilkan catatan "Barang pembelian akan dikirimkan bersamaan dengan armada barang sewaan."
- Tombol WhatsApp memanggil `recordLead` saat diklik, lalu membuka WhatsApp (jangan ditunda).
- Pilihan "Ambil di toko" nonaktif bila ada barang sewaan.

## 6. Kontrak data publik

`getPublicProducts()` mengembalikan `PublicProduct`: `id, name, category, base_price, overtime_rate, capacity_kva, description, image_path, is_featured, sort_order`. Produk yang disembunyikan admin sudah difilter. Gunakan `is_featured` untuk bagian "Unggulan" di beranda dan `productImageUrl()` (`src/lib/storage.ts`) untuk URL foto. Bila foto kosong, tampilkan placeholder (ikon di atas latar `bg-muted`).

## 7. Definition of done untuk perubahan tampilan

1. `npx tsc --noEmit` bersih.
2. `npm run lint` tidak menambah error baru.
3. Diuji manual di lebar 360 px, 768 px, dan 1280 px.
4. Alur lengkap tetap jalan: tambah ke keranjang → estimasi → hitung ongkir → WhatsApp (dan lead tercatat di `/dashboard/leads`).
5. Audit Lighthouse mobile tidak turun dari target di bagian 4.

# DESIGN.md — Panduan Desain JJ Teknik

Dokumen ini adalah **kontrak** untuk siapa pun (manusia atau AI) yang mengerjakan tampilan. Baca seluruhnya sebelum mengubah file.

## 1. Konsep: "Malam Acara, Arus Dingin"

JJ Teknik menjual dua hal: **dingin** (AC, misty fan) dan **daya** (genset), terutama untuk acara. Situs publik bercerita lewat satu dunia: **tenda acara di malam hari**. Lampu menyala karena genset (amber), udara mendingin karena AC (cyan). Motif yang sama muncul lagi di seluruh situs: hero, jam hari-H, stempel garansi, kalkulator, ilustrasi kartu produk.

Suasana yang dituju: reliable, premium, ramah, terpercaya, modern. Target, urut prioritas: event organizer, pabrik & korporat, konsumen umum.

Prinsip UX yang tidak boleh dilanggar:
1. **Mobile-first.** Rancang di 360 px dulu.
2. **Bukan toko online.** Tidak ada checkout/pembayaran. Ujung alur selalu *Lanjutkan via WhatsApp*. Harga = estimasi.
3. **Publik tidak boleh tahu stok.** Jangan tampilkan jumlah unit, "tersisa N", "habis", atau ketersediaan.
4. **Tidak mengarang.** Tidak ada testimoni palsu, angka pelanggan/rating karangan, atau logo klien tanpa izin. Angka harus berasal dari data nyata (katalog, `STANDARD_HOURS`, radius 25 km, tahun berdiri, dst).
5. **Animasi harus menjelaskan sesuatu** (panas jadi dingin, daya menyala, urutan langkah, angka berubah), bukan hiasan. UX dulu, baru wow.

## 2. Token (sumber kebenaran: `src/app/globals.css`)

Token publik di-scope ke kelas **`.theme-public`** (dipasang di `app/(public)/layout.tsx` dan `app/not-found.tsx`). Dashboard admin memakai token `:root` dan **tidak ikut berubah**. Satu tema saja (terang + band malam); tidak ada dark-mode toggle.

| Peran | Kelas Tailwind | Nilai |
|---|---|---|
| Navy Panggung (band malam, teks gelap) | `bg-ink`, `text-ink` | `#070F1F` |
| Biru Senja (kedalaman kedua) | `bg-ink-2` | `#12305A` |
| Cyan Udara (dingin, di atas gelap) | `text-frost`, `bg-frost` | `#5EE7F7` |
| Primary (cyan gelap di atas terang, 5:1) | `bg-primary`, `text-primary` | `#0A7894` |
| Amber Lampu (CTA utama, daya) | `bg-volt text-volt-foreground` | `#FFB547` |
| Merah Garansi (HANYA garansi) | `text-garansi` | `#C62A1F` |
| Hijau WhatsApp (tombol WA, 5:1) | `bg-wa` | `#15803D` |
| Es (latar halaman) / kartu | `bg-background` / `bg-card` | `#F5FAFC` / `#FFFFFF` |
| Teks sekunder | `text-muted-foreground` | `#4B5D70` |

Aturan warna: satu CTA amber per layar; jangan menulis hex di komponen (pakai token); kontras teks ≥ 4.5:1. Di band malam pakai `text-white/70` atau lebih terang untuk teks isi, dan **jangan meredupkan teks dengan `opacity`** (ganti warna saja).

Tipografi: **Unbounded** untuk heading/display (`font-heading`, otomatis di h1–h3), **Geologica** untuk isi (`font-sans`). Keduanya self-hosted di `src/app/fonts/` (lisensi OFL) lewat `next/font/local` di `app/(public)/fonts.ts`. Dashboard tetap Inter + Plus Jakarta Sans, juga self-hosted.

Utilitas (di `globals.css`):
- `band-night` (latar malam bergradasi), `grain` (tekstur halus), `panel` / `panel-night` (kartu terang/gelap)
- `num` (angka display tabular, font heading), `tnum` (angka tabular biasa)
- `draw-line` + induk `data-on="true"` (garis tergambar), `art-static` (ilustrasi garis diam)
- `lamp-on`, `stamp-in`, `drift`, `focus-ink`, `no-scrollbar`, `prose-jj` (artikel), `shadow-float`
- Lama dan masih ada untuk dashboard/404 lama: `.bg-hero`, `.text-gradient`, `.card-lift`, `.skeleton`, `.animate-float`

## 3. Animasi

- **Tanpa library animasi.** framer-motion tidak dipakai di halaman publik; semua animasi CSS atau canvas buatan sendiri. Jangan menambah GSAP/three/Lottie tanpa alasan kuat dan fallback statis.
- Hero (`components/public/tent-scene.tsx`): SVG tenda + partikel di `<canvas>`. 220 partikel di HP, 420 di desktop; mulai setelah browser idle; berhenti saat keluar layar atau tab tersembunyi. Kursor/sentuhan menambah panas (interaktif), dan `touch-action: pan-y` menjaga scroll tetap normal.
- Judul hero adalah teks biasa yang langsung tampil (LCP), tidak pernah menunggu animasi.
- `prefers-reduced-motion`: semua animasi mati (aturan global), hero langsung menampilkan keadaan akhir yang tetap bagus, dan petunjuk "gerakkan kursor" disembunyikan.
- Dilarang: scroll-hijacking, smooth-scroll library, layar loading penghalang, fade-in berurutan di setiap seksi.

## 4. Anggaran performa

- Font publik ±75 KB (dua woff2 variable, subset latin). Gambar lewat `next/image` dengan `sizes` yang benar.
- Peta Google di `/kontak` dimuat **hanya setelah diklik** (`map-embed.tsx`).
- Target Lighthouse mobile: Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 85, SEO ≥ 90.

## 5. Batas wilayah file (PENTING)

**Boleh diubah (tampilan publik):** `src/app/(public)/**`, `src/components/public/**`, `src/app/not-found.tsx`, `src/app/globals.css`, `src/content/**`, `src/lib/public/{business,content,faq,needs,site}.ts`.

**Jangan diubah (logika dan data):**
- `src/lib/public/use-estimator.ts` — seluruh logika estimator. UI boleh meminta nilai baru dengan **menambah** nilai kembalian hook, tanpa mengubah perhitungan. Pertahankan prop `waNumber` dan `pick`/`setPick` (UI sekarang memanggil `addProduct()` langsung, tapi hook tetap mengembalikan keduanya).
- `src/lib/public/{estimate,fleet,genset,whatsapp,cart,leads-client,products,types}.ts`, `src/app/api/**`, `src/lib/supabase/**`, `src/lib/validations/**`, seluruh `src/app/dashboard/**` dan `src/components/dashboard/**`.

Perilaku estimator yang harus dipertahankan:
- Jam mulai/selesai **kosong** secara default dan **wajib** bila ada genset.
- Sewa + pembelian dalam satu pesanan menampilkan "Barang pembelian akan dikirimkan bersamaan dengan armada barang sewaan."
- Tombol WhatsApp memanggil `recordLead` saat diklik, lalu langsung membuka WhatsApp.
- "Ambil di toko" nonaktif bila ada barang sewaan.

## 6. Kontrak data publik

- `getPublicProducts()` → `PublicProduct` (`id, name, category, base_price, overtime_rate, capacity_kva, description, image_path, is_featured, sort_order`) dan `rules` (aturan genset). Foto lewat `productImageUrl()`; tanpa foto, kartu menampilkan ilustrasi garis sesuai jenis produk.
- `src/lib/public/content.ts`: `GalleryItem` dan `Testimonial` + `getGallery()` / `getTestimonials()`. **Sekarang array kosong**; nanti diganti query Supabase tanpa mengubah tipenya. Setiap seksi punya keadaan kosong yang disengaja (disembunyikan di Beranda, ajakan WhatsApp di halaman penuh).
- `src/lib/public/needs.ts`: `estimateNeeds({ areaM2, people?, venue }) → { acUnits, pk, kva }`. **Rumusnya masih sementara (TODO).** Kapasitas genset di kalkulator dihitung dengan `recommendKva()` dari aturan genset yang sama dengan estimator.
- `src/lib/public/business.ts`: fakta usaha (alamat, armada, radius, garansi, jam buka). Hal yang belum dikonfirmasi owner ditandai `TODO(owner)` dan tidak ditampilkan sebagai fakta.

## 7. Halaman publik

`/` Beranda · `/katalog` · `/estimasi` · `/kalkulator` · `/galeri` · `/testimoni` · `/tentang` · `/kontak` · `/artikel` + `/artikel/[slug]` (konten statis di `src/content/articles.tsx`) · `sitemap.xml` · `robots.txt`. JSON-LD: LocalBusiness (Beranda, Kontak), FAQPage (Beranda), Article (artikel).

Elemen tetap di semua halaman: header (gelap di atas band malam `/` dan `/tentang`, terang setelah digulir), dok bawah (keranjang + tombol WhatsApp; disembunyikan di `/estimasi` karena estimator punya bilah total sendiri), footer dengan ajakan penutup.

## 8. Definition of done untuk perubahan tampilan

1. `npx tsc --noEmit` bersih, `npm run lint` tidak menambah error.
2. Uji di 360/390, 768, dan 1280 px, termasuk interaksi nyata (keranjang, estimator, kalkulator, menu HP).
3. Alur lengkap tetap jalan: katalog → keranjang → estimasi → hitung ongkir → WhatsApp (lead tercatat di `/dashboard/leads`).
4. Cek dengan `prefers-reduced-motion: reduce`.
5. Lighthouse mobile memenuhi target bagian 4.

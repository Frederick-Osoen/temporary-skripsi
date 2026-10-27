// Orang di balik JJ Teknik, ditampilkan di /tentang.
// Seksi tim baru muncul bila daftar ini berisi minimal satu orang DENGAN foto.
//
// Cara menambah:
// 1. Simpan foto di folder `public/tim/`, misalnya `public/tim/audy.jpg`
//    (potret tegak, sekitar 800 x 1000 px, ukuran < 300 KB).
// 2. Tambahkan satu baris di bawah, misalnya:
//    { name: 'Audy', role: 'Pemilik', photo: '/tim/audy.jpg' },
// Urutan di sini = urutan tampil.
export type TeamMember = { name: string; role: string; photo: string }

export const TEAM: TeamMember[] = []

// Foto bersama tim (opsional, lebar). Contoh: { src: '/tim/tim-lapangan.jpg', alt: 'Tim JJ Teknik di depan truk engkel' }
export const TEAM_PHOTO: { src: string; alt: string } | null = null

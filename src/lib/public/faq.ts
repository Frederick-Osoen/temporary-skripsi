import { STANDARD_HOURS } from '@/lib/orders/schedule'
import { BUSINESS } from './business'

export const FAQ = [
  {
    q: 'Berapa AC dan genset yang saya butuhkan?',
    a: 'Coba kalkulator kebutuhan di situs ini: isi jenis tempat, luas, dan jumlah tamu. Di halaman estimasi, centang "Sekalian sewa genset" dan kapasitas kVA dihitung dari jumlah AC. Admin akan memastikan angka finalnya.',
  },
  {
    q: 'Apakah ongkir sudah termasuk?',
    a: `Dalam radius ${BUSINESS.freeRadiusKm} km dari gudang kami di Pandaan, ongkir gratis. Di luar itu ongkir dihitung dari jarak, BBM, dan tol pulang-pergi. Untuk luar kota, ongkir ditentukan admin setelah konfirmasi.`,
  },
  {
    q: 'Sampai mana area layanannya?',
    a: 'Kami paling sering melayani Jawa Timur, tetapi pernah mengirim dan memasang sampai Bali. Kirim lokasi acara Anda lewat WhatsApp untuk dicek.',
  },
  {
    q: 'Kapan unit dipasang?',
    a: 'Unit sewa diantar dengan armada kami sendiri dan dipasang sehari sebelum acara, supaya hari acara tidak terganggu pemasangan.',
  },
  {
    q: 'Berapa lama genset boleh dipakai per hari?',
    a: `Standarnya ${STANDARD_HOURS} jam per hari. Pemakaian lebih dari itu dihitung sebagai overtime per jam, dibulatkan ke atas.`,
  },
  {
    q: 'Apakah harganya bisa dinego?',
    a: 'Bisa. Angka di situs ini estimasi untuk gambaran biaya. Harga final dibahas langsung dengan pemilik lewat WhatsApp.',
  },
  {
    q: 'Bisa ambil sendiri di toko?',
    a: 'Pengambilan di toko hanya untuk pembelian sparepart. Semua barang sewaan diantar dan dipasang oleh tim kami.',
  },
]

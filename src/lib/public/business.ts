// Fakta usaha yang tampil di situs publik. Ubah di sini saja.
// Yang bertanda TODO menunggu konfirmasi owner sebelum boleh ditampilkan apa adanya.

export const BUSINESS = {
  name: 'JJ Teknik',
  legalTagline: 'Sewa AC standing, misty fan & genset. Pengadaan, maintenance & servis AC.',
  founded: 2020,
  owner: 'Audy',
  street: 'Jl. Sedap Malam No.16, Macanan, Petungasri',
  district: 'Kec. Pandaan',
  city: 'Kabupaten Pasuruan',
  region: 'Jawa Timur',
  postalCode: '67156',
  country: 'ID',
  freeRadiusKm: 25,
  fleet: ['Mobil pickup', 'Truk engkel'],
  // Pernah dilayani: sampai Bali; mayoritas Jawa Timur.
  serviceArea: 'Seluruh Indonesia, terutama Jawa Timur',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=JJ+Teknik+Sewa+AC+Standing+Misty+Fan+Genset+Pandaan',
  mapsEmbedUrl:
    'https://www.google.com/maps?q=JJ%20Teknik%2C%20Jl.%20Sedap%20Malam%20No.16%2C%20Petungasri%2C%20Pandaan&output=embed',
  // TODO(owner): isi jam operasional yang benar, misal { days: 'Senin–Sabtu', time: '08.00–17.00' }.
  // Selama kosong, situs menampilkan ajakan chat WhatsApp, bukan jam karangan.
  hours: [] as { days: string; time: string }[],
  // TODO(owner): telepon di spanduk (0343) 633704 / 636710 belum dikonfirmasi, jangan ditampilkan dulu.
  phones: [] as string[],
} as const

// TODO(owner): redaksi dan syarat garansi wajib dikonfirmasi owner sebelum situs tayang.
export const GUARANTEE = {
  headline: 'AC tidak dingin? Tidak usah bayar.',
  body: 'Kalau unit AC sewaan kami tidak mendinginkan sesuai yang dijanjikan saat acara, Anda tidak membayar sewa unit tersebut.',
  terms: 'Syarat dan ketentuan disampaikan admin saat konfirmasi pesanan.',
} as const

export const fullAddress = `${BUSINESS.street}, ${BUSINESS.district}, ${BUSINESS.city}, ${BUSINESS.region} ${BUSINESS.postalCode}`

export const waLink = (number: string, text = `Halo ${BUSINESS.name}, saya ingin bertanya.`) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`

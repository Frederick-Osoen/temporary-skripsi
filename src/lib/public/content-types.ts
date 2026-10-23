// Tipe & label konten publik. Aman diimpor dari Client Component (tanpa kode server).

export type EventType = 'pernikahan' | 'korporat' | 'pabrik' | 'ulang_tahun' | 'lainnya'

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  pernikahan: 'Pernikahan',
  korporat: 'Korporat',
  pabrik: 'Pabrik',
  ulang_tahun: 'Ulang tahun',
  lainnya: 'Lainnya',
}

export type GalleryItem = {
  id: string
  image_path: string // path di bucket Storage, sama seperti foto produk
  caption: string
  event_type: EventType
  location?: string
  date?: string // YYYY-MM-DD
}

export type Testimonial = {
  id: string
  name: string
  role?: string // misal "Event Organizer, Surabaya"
  quote: string
  image_path?: string // tangkapan layar chat (dengan izin pelanggan)
  event_type?: EventType
}

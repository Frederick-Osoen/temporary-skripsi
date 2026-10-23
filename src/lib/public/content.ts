// Konten yang nanti dikelola admin dari database (galeri & testimoni).
// SEMENTARA masih array kosong. Jangan isi dengan data contoh/palsu: setiap seksi
// sudah punya keadaan kosong sendiri. Saat tabelnya siap, ganti isi fungsi di bawah
// dengan query Supabase tanpa mengubah bentuk tipenya.

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

const GALLERY: GalleryItem[] = []
const TESTIMONIALS: Testimonial[] = []

export async function getGallery(): Promise<GalleryItem[]> {
  return GALLERY
}

export async function getTestimonials(): Promise<Testimonial[]> {
  return TESTIMONIALS
}

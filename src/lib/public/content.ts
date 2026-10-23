// Galeri & testimoni dikelola admin (tabel gallery_items & testimonials, lihat fase-7a.sql).
// Jangan isi dengan data contoh/palsu: setiap seksi punya keadaan kosong sendiri.
import { createPublicClient } from '@/lib/supabase/public'

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

export async function getGallery(): Promise<GalleryItem[]> {
  const { data, error } = await createPublicClient()
    .from('gallery_items')
    .select('id, image_path, caption, event_type, location, event_date')
    .eq('is_published', true)
    .order('sort_order')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[content] galeri:', error.message)
    return []
  }
  return (data ?? []).map((g) => ({
    id: g.id,
    image_path: g.image_path,
    caption: g.caption,
    event_type: g.event_type as EventType,
    location: g.location ?? undefined,
    date: g.event_date ?? undefined,
  }))
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await createPublicClient()
    .from('testimonials')
    .select('id, name, role, quote, image_path, event_type')
    .eq('is_published', true)
    .eq('consent', true)
    .order('sort_order')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[content] testimoni:', error.message)
    return []
  }
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    role: t.role ?? undefined,
    quote: t.quote,
    image_path: t.image_path ?? undefined,
    event_type: (t.event_type as EventType | null) ?? undefined,
  }))
}

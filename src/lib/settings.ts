import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { WA_NUMBER } from '@/lib/public/config'

export type StoreSettings = {
  wa_number: string
  fuel_rate_pickup: number
  fuel_rate_truck: number
  // Kolom dari fase-9d.sql. Kosong = belum diisi (atau SQL belum dijalankan).
  store_phone: string
  opening_hours: string // satu baris per hari, mis. "Senin–Sabtu: 08.00–17.00"
  notify_emails: string // dipisah koma; kosong = pakai NOTIFY_EMAILS dari .env
  // Kolom dari fase-9e.sql. Kosong = tidak ditampilkan di situs.
  contact_email: string
  instagram_url: string
  tiktok_url: string
}

// Dipakai bila tabel belum ada / gagal dibaca, supaya situs publik tidak ikut mati.
export const DEFAULT_SETTINGS: StoreSettings = {
  wa_number: WA_NUMBER,
  fuel_rate_pickup: 1000,
  fuel_rate_truck: 975,
  store_phone: '',
  opening_hours: '',
  notify_emails: '',
  contact_email: '',
  instagram_url: '',
  tiktok_url: '',
}

// Baris "Hari: jam" -> daftar untuk ditampilkan. Baris tanpa titik dua tampil sebagai satu teks.
export function parseOpeningHours(text: string): { days: string; time: string }[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 7)
    .map((l) => {
      const i = l.indexOf(':')
      return i > 0 ? { days: l.slice(0, i).trim(), time: l.slice(i + 1).trim() } : { days: l, time: '' }
    })
}

export function rowToSettings(data: Record<string, unknown> | null | undefined): StoreSettings {
  if (!data) return DEFAULT_SETTINGS
  return {
    wa_number: String(data.wa_number ?? DEFAULT_SETTINGS.wa_number),
    fuel_rate_pickup: Number(data.fuel_rate_pickup ?? DEFAULT_SETTINGS.fuel_rate_pickup),
    fuel_rate_truck: Number(data.fuel_rate_truck ?? DEFAULT_SETTINGS.fuel_rate_truck),
    store_phone: String(data.store_phone ?? ''),
    opening_hours: String(data.opening_hours ?? ''),
    notify_emails: String(data.notify_emails ?? ''),
    contact_email: String(data.contact_email ?? ''),
    instagram_url: String(data.instagram_url ?? ''),
    tiktok_url: String(data.tiktok_url ?? ''),
  }
}

// Server-only (service role). Satu kali baca per request.
// select('*') supaya tetap jalan sebelum fase-9d.sql dijalankan (kolom baru tinggal kosong).
export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const { data, error } = await createAdminClient().from('store_settings').select('*').eq('id', 1).maybeSingle()
    if (error || !data) return DEFAULT_SETTINGS
    return rowToSettings(data)
  } catch {
    return DEFAULT_SETTINGS
  }
})

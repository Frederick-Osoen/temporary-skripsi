import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { WA_NUMBER } from '@/lib/public/config'

export type StoreSettings = {
  wa_number: string
  fuel_rate_pickup: number
  fuel_rate_truck: number
}

// Dipakai bila tabel belum ada / gagal dibaca, supaya situs publik tidak ikut mati.
export const DEFAULT_SETTINGS: StoreSettings = {
  wa_number: WA_NUMBER,
  fuel_rate_pickup: 1000,
  fuel_rate_truck: 975,
}

// Server-only (service role). Satu kali baca per request.
export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const { data, error } = await createAdminClient()
      .from('store_settings')
      .select('wa_number, fuel_rate_pickup, fuel_rate_truck')
      .eq('id', 1)
      .maybeSingle()
    if (error || !data) return DEFAULT_SETTINGS
    return {
      wa_number: String(data.wa_number),
      fuel_rate_pickup: Number(data.fuel_rate_pickup),
      fuel_rate_truck: Number(data.fuel_rate_truck),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
})

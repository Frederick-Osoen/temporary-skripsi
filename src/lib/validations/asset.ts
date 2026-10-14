import { z } from 'zod'
import type { MaintenanceAlert } from '@/lib/maintenance'

export const ASSET_STATUSES = ['available', 'allocated', 'maintenance', 'damaged'] as const

export const assetSchema = z.object({
  product_id: z.string().uuid('Produk tidak valid'),
  asset_code: z
    .string({ error: 'Kode aset wajib diisi' })
    .trim()
    .toUpperCase()
    .min(2, 'Kode minimal 2 karakter')
    .max(50, 'Kode maksimal 50 karakter')
    .regex(/^[A-Z0-9-]+$/, 'Kode hanya boleh huruf, angka, dan tanda -'),
  initial_count: z.coerce
    .number({ error: 'Hitungan awal harus angka' })
    .int('Harus bilangan bulat')
    .min(0, 'Tidak boleh negatif')
    .max(10000, 'Terlalu besar'),
  status: z.enum(ASSET_STATUSES, { error: 'Status tidak valid' }),
})

// Saat edit, produk tidak boleh dipindah (menjaga konsistensi total_stock)
export const assetUpdateSchema = assetSchema.omit({ product_id: true })

export const maintenanceSchema = z.object({
  unit_asset_id: z.string().uuid('Unit tidak valid'),
  type: z.enum(['service_kecil', 'service_besar'], { error: 'Jenis service tidak valid' }),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid'),
  description: z
    .string()
    .trim()
    .max(500, 'Catatan maksimal 500 karakter')
    .transform((v) => v || null),
})

export type AssetRow = {
  id: string
  product_id: string
  product_name: string
  asset_code: string
  initial_count: number
  rental_count: number
  total_count: number
  status: (typeof ASSET_STATUSES)[number]
  version: number
  updated_at: string
  alert: MaintenanceAlert | null // null = bukan AC
  logs: MaintenanceHistoryItem[]
}

export type ProductOption = { 
  id: string; 
  name: string }

export type MaintenanceHistoryItem = {
  id: string
  type: 'service_kecil' | 'service_besar'
  service_date: string // YYYY-MM-DD
  description: string | null
  rental_count_at_service: number
}
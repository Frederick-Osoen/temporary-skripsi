import type { SupabaseClient } from '@supabase/supabase-js'
import { evaluateMaintenance, isAcProduct, type MaintenanceAlert, type MaintenanceLog } from '@/lib/maintenance'

export type MaintenanceUnit = {
  id: string
  asset_code: string
  product_name: string
  status: 'available' | 'allocated' | 'maintenance' | 'damaged'
  total_count: number
  alert: MaintenanceAlert
}

type Raw = {
  id: string
  asset_code: string
  initial_count: number
  rental_count: number
  status: MaintenanceUnit['status']
  products: { name: string } | { name: string }[] | null
  maintenance_logs: MaintenanceLog[] | null
}

const LEVEL_RANK = { urgent: 0, warning: 1, ok: 2 } as const

/** Evaluasi perawatan seluruh unit AC. Dipakai halaman Ringkasan dan Maintenance (satu sumber logika). */
export async function loadMaintenanceOverview(
  supabase: SupabaseClient
): Promise<{ units: MaintenanceUnit[]; error: string | null }> {
  const { data, error } = await supabase
    .from('unit_assets')
    .select('id, asset_code, initial_count, rental_count, status, products(name), maintenance_logs(type, rental_count_at_service)')
    .order('asset_code')

  if (error) return { units: [], error: error.message }

  const units: MaintenanceUnit[] = []
  for (const r of (data ?? []) as unknown as Raw[]) {
    const product = Array.isArray(r.products) ? r.products[0] : r.products
    const name = product?.name ?? '-'
    if (!isAcProduct(name)) continue // aturan perawatan hanya untuk AC
    units.push({
      id: r.id,
      asset_code: r.asset_code,
      product_name: name,
      status: r.status,
      total_count: r.initial_count + r.rental_count,
      alert: evaluateMaintenance(r.initial_count, r.rental_count, r.maintenance_logs ?? []),
    })
  }

  units.sort(
    (a, b) =>
      LEVEL_RANK[a.alert.level] - LEVEL_RANK[b.alert.level] ||
      b.alert.since - a.alert.since ||
      a.asset_code.localeCompare(b.asset_code, 'id', { numeric: true })
  )
  return { units, error: null }
}

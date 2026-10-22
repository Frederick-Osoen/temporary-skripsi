import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrderDetailData } from './detail'
import { isTerminal } from './status'

export type UnitStatus = 'available' | 'allocated' | 'maintenance' | 'damaged'

export type UnitBusy = { order_id: string; order_code: string; customer: string; setup_date: string; end_date: string }
export type AllocationUnit = { id: string; code: string; status: UnitStatus; total_count: number; busy: UnitBusy | null }
export type VendorLine = { vendor_name: string; count: number }

export type AllocationItem = {
  order_item_id: string
  product_name: string
  qty: number
  unit_ids: string[] // unit internal yang sudah dialokasikan
  outsourced: VendorLine[]
  units: AllocationUnit[] // semua unit produk ini
}

export type AllocationData = {
  order_id: string
  version: number
  setup_date: string
  end_date: string
  locked: boolean
  items: AllocationItem[]
}

type UnitRow = { id: string; product_id: string; asset_code: string; status: UnitStatus; initial_count: number; rental_count: number }
type AssignRow = { order_item_id: string; unit_asset_id: string | null; is_outsourced: boolean; vendor_name: string | null }
type ConflictRow = { c_unit_id: string; c_order_id: string; c_order_code: string; c_setup: string; c_end: string; c_customer: string }

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

export const isFreeUnit = (u: AllocationUnit) => u.status === 'available' && !u.busy

// Pilih otomatis: unit paling jarang dipakai dulu, agar keausan dan jadwal servis merata
export function autoPickUnits(units: AllocationUnit[], already: Set<string>, need: number): string[] {
  if (need <= 0) return []
  return units
    .filter((u) => isFreeUnit(u) && !already.has(u.id))
    .sort((a, b) => a.total_count - b.total_count || natural(a.code, b.code))
    .slice(0, need)
    .map((u) => u.id)
}

export async function getAllocationData(
  supabase: SupabaseClient,
  order: OrderDetailData
): Promise<{ data: AllocationData | null; error: string | null }> {
  const rentalItems = order.items.filter((i) => i.category === 'rental')
  if (rentalItems.length === 0) return { data: null, error: null }

  const productIds = [...new Set(rentalItems.map((i) => i.product_id))]

  const [unitsRes, assignRes, conflictRes] = await Promise.all([
    supabase.from('unit_assets').select('id, product_id, asset_code, status, initial_count, rental_count').in('product_id', productIds),
    supabase.from('asset_assignments').select('order_item_id, unit_asset_id, is_outsourced, vendor_name').eq('order_id', order.id),
    supabase.rpc('get_unit_conflicts', { p_order_id: order.id }),
  ])
  const err = unitsRes.error ?? assignRes.error ?? conflictRes.error
  if (err) return { data: null, error: err.message }

  const units = (unitsRes.data ?? []) as UnitRow[]
  const assignments = (assignRes.data ?? []) as AssignRow[]

  const busyByUnit = new Map<string, UnitBusy>()
  for (const c of (conflictRes.data ?? []) as ConflictRow[]) {
    if (!busyByUnit.has(c.c_unit_id)) {
      busyByUnit.set(c.c_unit_id, {
        order_id: c.c_order_id, order_code: c.c_order_code,
        customer: c.c_customer, setup_date: c.c_setup, end_date: c.c_end,
      })
    }
  }

  const items: AllocationItem[] = rentalItems.map((item) => {
    const mine = assignments.filter((a) => a.order_item_id === item.id)

    const vendors = new Map<string, number>()
    for (const a of mine.filter((x) => x.is_outsourced)) {
      const name = a.vendor_name ?? ''
      vendors.set(name, (vendors.get(name) ?? 0) + 1)
    }

    return {
      order_item_id: item.id,
      product_name: item.name,
      qty: item.qty,
      unit_ids: mine.filter((a) => !a.is_outsourced && a.unit_asset_id).map((a) => a.unit_asset_id as string),
      outsourced: [...vendors].map(([vendor_name, count]) => ({ vendor_name, count })),
      units: units
        .filter((u) => u.product_id === item.product_id)
        .map((u) => ({
          id: u.id,
          code: u.asset_code,
          status: u.status,
          total_count: u.initial_count + u.rental_count,
          busy: busyByUnit.get(u.id) ?? null,
        }))
        .sort((a, b) => natural(a.code, b.code)),
    }
  })

  return {
    data: {
      order_id: order.id,
      version: order.version,
      setup_date: order.setup_date,
      end_date: order.end_date,
      locked: isTerminal(order.status),
      items,
    },
    error: null,
  }
}
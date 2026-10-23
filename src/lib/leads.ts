// Tipe dan pengubah data lead (dari halaman estimasi publik) -> nilai awal form pesanan admin.
// Murni (tanpa akses database) agar mudah diuji.
import { addDays } from '@/lib/orders/utils'
import { PICKUP_DESTINATION, type OrderFormValues, type OrderProduct } from '@/lib/validations/order'

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'dismissed'

export type LeadPayload = {
  items?: { product_id?: string; name: string; qty: number; category: string }[]
  start_date?: string
  end_date?: string
  start_time?: string | null
  end_time?: string | null
  delivery?: string
  destination?: string | null
  fleet?: string | null
  fleet_pickups?: number
  fleet_trucks?: number
  distance_km?: number | null
  shipping_pending?: boolean
  notes?: string[]
}

export type LeadRow = {
  id: string
  created_at: string
  customer_name: string
  payload: LeadPayload | null
  total_estimate: number
  status: LeadStatus
  converted_order_id: string | null
}

export const ANONYMOUS_LEAD_NAME = 'Tanpa nama'

export const DEFAULT_SHIPPING: OrderFormValues['shipping'] = {
  zone: 0, distance_km: 0, auto_fuel_fee: 0, auto_toll_fee: 0, toll_override: null, manual_shipping_fee: null,
}

export type LeadPrefill = {
  values: OrderFormValues
  /** Hal yang tidak bisa terisi otomatis dan perlu dicek admin */
  warnings: string[]
  /** Info dari pelanggan yang tidak punya kolom di form (jam genset, catatan) */
  info: string[]
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Cocokkan item lead ke produk saat ini: pakai product_id, jika tidak ada (lead lama) pakai nama. */
export function leadToOrderValues(lead: LeadRow, products: OrderProduct[]): LeadPrefill {
  const p = lead.payload ?? {}
  const byId = new Map(products.map((x) => [x.id, x]))
  const byName = new Map(products.map((x) => [x.name.trim().toLowerCase(), x]))
  const warnings: string[] = []
  const info: string[] = []

  // Gabungkan produk yang sama (qty dijumlah) agar lolos aturan "tidak boleh duplikat"
  const merged = new Map<string, { product: OrderProduct; qty: number }>()
  for (const it of p.items ?? []) {
    const product = (it.product_id && byId.get(it.product_id)) || byName.get(it.name.trim().toLowerCase())
    if (!product) {
      warnings.push(`Produk "${it.name}" (${it.qty} unit) tidak ditemukan lagi di katalog. Tambahkan manual bila perlu.`)
      continue
    }
    const cur = merged.get(product.id)
    merged.set(product.id, { product, qty: (cur?.qty ?? 0) + Math.max(1, Math.min(1000, Math.round(it.qty || 1))) })
  }
  const items = [...merged.values()].map(({ product, qty }) => ({
    line_id: null,
    product_id: product.id,
    qty,
    unit_price: product.base_price, // harga katalog saat ini; admin bisa menyesuaikan hasil negosiasi
  }))
  const hasRental = [...merged.values()].some((m) => m.product.category === 'rental')

  const start = p.start_date && DATE_RE.test(p.start_date) ? p.start_date : ''
  const end = hasRental && p.end_date && DATE_RE.test(p.end_date) && p.end_date >= start ? p.end_date : start
  const setup = !start ? '' : hasRental ? addDays(start, -1) : start

  const storePickup = p.delivery === 'store_pickup' && !hasRental
  const trucks = p.fleet_trucks ?? 0

  if (p.start_time && p.end_time) {
    info.push(`Jam pemakaian genset dari pelanggan: ${p.start_time} - ${p.end_time}. Atur di bagian Jadwal setelah pesanan disimpan.`)
  }
  for (const n of p.notes ?? []) info.push(n)
  if (!storePickup) info.push('Ongkir belum terhitung: tekan "Hitung Ongkir" pada bagian Pengiriman.')

  const name = lead.customer_name === ANONYMOUS_LEAD_NAME ? '' : lead.customer_name

  return {
    warnings,
    info,
    values: {
      phone: '', // pelanggan baru menghubungi lewat WhatsApp; admin mengisi nomornya dari chat
      customer_name: name,
      customer_type: 'regular',
      delivery_mode: storePickup ? 'store_pickup' : 'delivery',
      destination: storePickup ? PICKUP_DESTINATION : (p.destination ?? ''),
      fleet_type: trucks > 0 ? 'truck' : 'pickup',
      start_date: start,
      end_date: end,
      setup_date: setup,
      items,
      shipping: { ...DEFAULT_SHIPPING },
    },
  }
}

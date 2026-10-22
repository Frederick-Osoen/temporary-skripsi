import type { ShippingValues } from '@/lib/validations/order'

const rupiahFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
export const formatRupiah = (n: number) => rupiahFmt.format(Number.isFinite(n) ? n : 0)
export const todayWIB = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })


// 'YYYY-MM-DD' ditampilkan apa adanya (tanpa geser zona waktu)
export const formatDate = (d: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${d}T00:00:00Z`)
  )

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// Untuk input opsional: kosong = null
export const toNullableNumber = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const formatNumber = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0}).format(n)

const num = (n: number) => (Number.isFinite(n) ? n : 0)

// Durasi sewa inklusif: 10 Jan - 10 Jan = 1 hari, 10 Jan - 12 Jan = 3 hari
export function rentalDays(start: string, end: string): number {
  const iso = /^\d{4}-\d{2}-\d{2}$/
  if (!iso.test(start) || !iso.test(end)) return 1
  const diff = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)
  return Math.max(1, Math.round(diff / 86_400_000) + 1)
}

export type PricedLine = { qty: number; unit_price: number; is_rental: boolean }

// Rental dikali durasi hari, sales tidak
export const lineSubtotal = (l: PricedLine, days: number) =>
  Math.round(num(l.qty) * num(l.unit_price) * (l.is_rental ? Math.max(1, days) : 1))

export const calcItemsTotal = (lines: PricedLine[], days: number) =>
  lines.reduce((sum, l) => sum + lineSubtotal(l, days), 0)

export type ResolvedShipping = { distance_km: number; fuel_fee: number; toll_fee: number; shipping_fee: number }

// Dipakai bersama oleh form (pratinjau) dan server (hasil akhir). Invarian: shipping_fee = fuel_fee + toll_fee
export function resolveShipping(
  mode: 'delivery' | 'store_pickup',
  s: ShippingValues
): { ok: true; value: ResolvedShipping } | { ok: false; error: string } {
  if (mode === 'store_pickup') {
    return { ok: true, value: { distance_km: 0, fuel_fee: 0, toll_fee: 0, shipping_fee: 0 } }
  }
  if (s.zone === 0) return { ok: false, error: 'Hitung ongkir terlebih dahulu atau isi manual.' }

  const manual = s.manual_shipping_fee
  if (s.zone === 3 && manual === null) return { ok: false, error: 'Zona luar kota: ongkir wajib diisi manual.' }

  const distance = num(s.distance_km)
  const tollWanted = s.zone === 1 ? 0 : Math.round(s.toll_override ?? s.auto_toll_fee)

  // Harga hasil nego/manual: tol dibatasi agar tidak melebihi ongkir, sisanya dianggap BBM & operasional
  if (manual !== null) {
    const shipping = Math.round(manual)
    const toll = Math.min(tollWanted, shipping)
    return { ok: true, value: { distance_km: distance, fuel_fee: shipping - toll, toll_fee: toll, shipping_fee: shipping } }
  }

  if (s.zone === 1) {
    return { ok: true, value: { distance_km: distance, fuel_fee: 0, toll_fee: 0, shipping_fee: 0 } }
  }

  const fuel = Math.round(s.auto_fuel_fee)
  return { ok: true, value: { distance_km: distance, fuel_fee: fuel, toll_fee: tollWanted, shipping_fee: fuel + tollWanted } }
}
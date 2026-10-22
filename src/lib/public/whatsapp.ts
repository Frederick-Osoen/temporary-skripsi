import { formatDate, formatRupiah } from '@/lib/orders/utils'
import { STORE_NAME, WA_NUMBER } from './config'
import type { EstimateInput, EstimateResult } from './estimate'

export function buildWhatsAppDraft(args: {
  name: string
  destination: string
  fleetLabel: string | null
  distanceKm: number | null
  input: EstimateInput
  result: EstimateResult
  notes?: string[]
}): { text: string; url: string } {
  const { name, destination, fleetLabel, distanceKm, input, result, notes = [] } = args
  const L: string[] = []

  L.push(`Halo ${STORE_NAME}, saya ingin ${result.hasRental ? 'menyewa' : 'membeli'} berikut:`)
  if (name.trim()) L.push(`*Nama:* ${name.trim()}`)
  L.push('')

  L.push('*Item:*')
  for (const l of input.lines.slice(0, 25)) L.push(`- ${l.name} × ${l.qty}`)
  L.push('')

  if (result.hasRental) {
    L.push(
      `*Tanggal acara:* ${formatDate(input.start_date)}` +
        (input.end_date !== input.start_date ? ` – ${formatDate(input.end_date)}` : '') +
        ` (${result.days} hari)`
    )
    if (result.hoursPerDay !== null && input.lines.some((l) => l.capacity_kva !== null)) {
      L.push(`*Jam pemakaian genset:* ${input.start_time} – ${input.end_time} (${result.hoursPerDay} jam/hari)`)
    }
  } else {
    L.push(`*Tanggal:* ${formatDate(input.start_date)}`)
  }

  L.push('')
  if (input.delivery === 'store_pickup') {
    L.push('*Pengambilan:* diambil di toko')
  } else {
    L.push(`*Lokasi tujuan:* ${destination}`)
    if (fleetLabel) L.push(`*Armada:* ${fleetLabel}${distanceKm !== null ? ` · jarak ± ${distanceKm} km` : ''}`)
  }

  L.push('')
  L.push('*Estimasi biaya:*')
  L.push(`- ${result.hasRental ? 'Sewa/produk' : 'Produk'}: ${formatRupiah(result.itemsTotal)}`)
  L.push(`- Ongkir: ${result.shippingPending ? 'dikonfirmasi admin' : formatRupiah(result.shippingFee ?? 0)}`)
  if (result.overtimeFee > 0) L.push(`- Overtime genset (estimasi): ${formatRupiah(result.overtimeFee)}`)
  L.push(`*Total estimasi: ${formatRupiah(result.total)}${result.shippingPending ? ' + ongkir' : ''}*`)

  if (notes.length > 0) {
    L.push('')
    for (const n of notes) L.push(`Catatan: ${n}`)
  }
  L.push('')
  L.push('_Estimasi dari website. Harga final mengikuti kesepakatan._')

  const text = L.join('\n')
  return { text, url: `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}` }
}
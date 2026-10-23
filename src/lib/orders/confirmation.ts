import { STORE_NAME } from '@/lib/public/config'
import { PICKUP_DESTINATION } from '@/lib/validations/order'
import { formatDate, formatRupiah, rentalDays } from './utils'
import { STATUS_LABEL } from './status'
import { summarizePayments } from './payments'
import type { OrderDetailData } from './detail'

// Pesan konfirmasi untuk dikirim admin ke pelanggan lewat WhatsApp (click-to-chat, tanpa API).
export function buildConfirmationMessage(order: OrderDetailData, payments: { amount: number }[]): { text: string; url: string } {
  const pay = summarizePayments(order.total_amount, payments)
  const L: string[] = []
  L.push(`Halo ${order.customer.name}, berikut konfirmasi pesanan Anda di ${STORE_NAME}:`)
  L.push('')
  L.push(`*Kode pesanan:* ${order.order_code}`)
  L.push('*Item:*')
  for (const i of order.items) L.push(`- ${i.name} × ${i.qty}`)
  L.push('')
  if (order.hasRental) {
    const days = rentalDays(order.start_date, order.end_date)
    L.push(
      `*Tanggal acara:* ${formatDate(order.start_date)}` +
        (order.end_date !== order.start_date ? ` – ${formatDate(order.end_date)}` : '') +
        ` (${days} hari)`
    )
  } else {
    L.push(`*Tanggal:* ${formatDate(order.start_date)}`)
  }
  L.push(order.destination === PICKUP_DESTINATION ? '*Pengambilan:* diambil di toko' : `*Tujuan:* ${order.destination}`)
  L.push('')
  L.push(`*Total:* ${formatRupiah(order.total_amount)}`)
  if (pay.paid > 0) L.push(`*Sudah dibayar:* ${formatRupiah(pay.paid)}`)
  L.push(pay.paidOff ? '*Status pembayaran:* Lunas' : `*Sisa pembayaran:* ${formatRupiah(pay.remaining)}`)
  L.push(`*Status:* ${STATUS_LABEL[order.status]}`)
  L.push('')
  L.push('Terima kasih. Kabari kami bila ada yang perlu diubah.')
  const text = L.join('\n')
  return { text, url: `https://wa.me/${order.customer.phone_number}?text=${encodeURIComponent(text)}` }
}

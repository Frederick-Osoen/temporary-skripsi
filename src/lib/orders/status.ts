export const ORDER_STATUSES = [
  'pending_dp', 'dp_received', 'in_setup', 'event_running', 'waiting_payment', 'completed', 'cancelled',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_dp: 'Menunggu DP',
  dp_received: 'DP Diterima',
  in_setup: 'Pemasangan',
  event_running: 'Acara Berjalan',
  waiting_payment: 'Menunggu Pelunasan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const FLOW_RENTAL: readonly OrderStatus[] = [
  'pending_dp', 'dp_received', 'in_setup', 'event_running', 'waiting_payment', 'completed',
]
const FLOW_SALES: readonly OrderStatus[] = ['pending_dp', 'dp_received', 'completed']

export const statusFlow = (hasRental: boolean) => (hasRental ? FLOW_RENTAL : FLOW_SALES)
export const isTerminal = (s: OrderStatus) => s === 'completed' || s === 'cancelled'

// Langkah maju berikutnya. Dari Acara Berjalan: sudah lunas -> Selesai, belum -> Menunggu Pelunasan.
export function getNextStatus(current: OrderStatus, hasRental: boolean, fullyPaid = false): OrderStatus | null {
  if (current === 'event_running') return fullyPaid ? 'completed' : 'waiting_payment'
  const flow = statusFlow(hasRental)
  const i = flow.indexOf(current)
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null
}

// Batal hanya sebelum acara berjalan
export const canCancel = (s: OrderStatus) => s === 'pending_dp' || s === 'dp_received' || s === 'in_setup'

export const REFUND_WARNING =
  'Peringatan: DP sudah diterima. Pengembalian dana (refund) dilakukan secara manual di luar sistem sesuai kebijakan manajemen.'

// DP sudah masuk (DP Diterima atau Pemasangan): membatalkan berarti DP hangus
export const cancelNeedsRefundWarning = (s: OrderStatus) => s === 'dp_received' || s === 'in_setup'
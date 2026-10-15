export const ORDER_STATUSES = [
  'pending_dp', 'dp_received', 'in_setup', 'event_running', 'completed', 'cancelled',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_dp: 'Menunggu DP',
  dp_received: 'DP Diterima',
  in_setup: 'Pemasangan',
  event_running: 'Acara Berjalan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const FLOW_RENTAL: readonly OrderStatus[] = ['pending_dp', 'dp_received', 'in_setup', 'event_running', 'completed']
const FLOW_SALES: readonly OrderStatus[] = ['pending_dp', 'dp_received', 'completed']

export const statusFlow = (hasRental: boolean) => (hasRental ? FLOW_RENTAL : FLOW_SALES)
export const isTerminal = (s: OrderStatus) => s === 'completed' || s === 'cancelled'

// Langkah maju berikutnya (satu per satu agar tidak ada status terlewat tanpa sengaja)
export function getNextStatus(current: OrderStatus, hasRental: boolean): OrderStatus | null {
  const flow = statusFlow(hasRental)
  const i = flow.indexOf(current)
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null
}

// Batal hanya sebelum acara berjalan
export const canCancel = (s: OrderStatus) => s === 'pending_dp' || s === 'dp_received' || s === 'in_setup'

export function isTransitionAllowed(from: OrderStatus, to: OrderStatus, hasRental: boolean): boolean {
  if (isTerminal(from)) return false
  if (to === 'cancelled') return canCancel(from)
  return to === getNextStatus(from, hasRental)
}
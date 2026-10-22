import { addDays } from '@/lib/orders/utils'
import { PICKUP_DESTINATION } from '@/lib/validations/order'
import type { OrderStatus } from '@/lib/orders/status'

export type CalendarKind = 'setup' | 'event' | 'teardown' | 'sales_delivery' | 'store_pickup'

// Warna mengikuti Bab 3 (biru = pemasangan H-1, oranye = antar sales, kuning = ambil di toko). Dipakai lagi di Fase 7.
export const KIND_META: Record<CalendarKind, { label: string; short: string; chip: string; dot: string }> = {
  setup: { label: 'Pemasangan (H-1)', short: 'Pasang', chip: 'border-blue-200 bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
  event: { label: 'Acara', short: 'Acara', chip: 'border-green-200 bg-green-100 text-green-800', dot: 'bg-green-500' },
  teardown: { label: 'Pembongkaran (H+1)', short: 'Bongkar', chip: 'border-slate-200 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  sales_delivery: { label: 'Antar penjualan', short: 'Antar', chip: 'border-orange-200 bg-orange-100 text-orange-800', dot: 'bg-orange-500' },
  store_pickup: { label: 'Ambil di toko', short: 'Ambil', chip: 'border-yellow-200 bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
}

const KIND_ORDER: CalendarKind[] = ['setup', 'event', 'teardown', 'sales_delivery', 'store_pickup']

export type CalendarEvent = {
  key: string
  date: string
  kind: CalendarKind
  order_id: string
  order_code: string
  customer: string
  status: OrderStatus
  warn: boolean // alokasi unit belum lengkap
}

export type CalendarOrder = {
  id: string
  order_code: string
  status: OrderStatus
  setup_date: string
  start_date: string
  end_date: string
  destination: string
  customer: string
  hasRental: boolean
  missing: number
}

const mondayIndex = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7

export function monthGrid(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const first = `${ym}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const offset = mondayIndex(first)
  const rows = Math.ceil((offset + lastDay) / 7)
  const gridStart = addDays(first, -offset)
  const weeks = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => addDays(gridStart, r * 7 + c))
  )
  return { weeks, gridStart, gridEnd: weeks[rows - 1][6] }
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export const monthTitle = (ym: string) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${ym}-01T00:00:00Z`))

export function buildEvents(orders: CalendarOrder[], rangeStart: string, rangeEnd: string) {
  const byDate: Record<string, CalendarEvent[]> = {}

  const push = (o: CalendarOrder, date: string, kind: CalendarKind, warn: boolean) => {
    if (date < rangeStart || date > rangeEnd) return
    ;(byDate[date] ??= []).push({
      key: `${o.id}:${kind}:${date}`, date, kind, order_id: o.id, order_code: o.order_code,
      customer: o.customer, status: o.status, warn,
    })
  }

  for (const o of orders) {
    if (o.hasRental) {
      const warn = o.missing > 0 && o.status !== 'completed'
      push(o, o.setup_date, 'setup', warn)
      for (let d = o.start_date, i = 0; d <= o.end_date && i < 90; d = addDays(d, 1), i++) push(o, d, 'event', warn)
      push(o, addDays(o.end_date, 1), 'teardown', false)
    } else {
      push(o, o.start_date, o.destination === PICKUP_DESTINATION ? 'store_pickup' : 'sales_delivery', false)
    }
  }

  for (const list of Object.values(byDate)) {
    list.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.order_code.localeCompare(b.order_code))
  }
  return byDate
}
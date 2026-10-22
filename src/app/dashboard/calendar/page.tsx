import { createClient } from '@/lib/supabase/server'
import { CalendarMonth } from '@/components/dashboard/calendar/calendar-month'
import { buildEvents, monthGrid, type CalendarOrder } from '@/lib/calendar'
import { addDays, todayWIB } from '@/lib/orders/utils'
import type { OrderStatus } from '@/lib/orders/status'

type Row = {
  id: string
  order_code: string
  status: OrderStatus
  setup_date: string
  start_date: string
  end_date: string
  destination: string
  customers: { name: string } | { name: string }[] | null
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams
  const today = todayWIB()
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(m ?? '') ? (m as string) : today.slice(0, 7)
  const { weeks, gridStart, gridEnd } = monthGrid(ym)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, status, setup_date, start_date, end_date, destination, customers(name)')
    .neq('status', 'cancelled')
    .lte('setup_date', gridEnd)
    .gte('end_date', addDays(gridStart, -1)) // -1 agar pembongkaran H+1 di awal grid ikut

  if (error) return <p className="text-sm text-destructive">Gagal memuat kalender: {error.message}</p>
  const rows = (data ?? []) as unknown as Row[]

  const ids = rows.map((r) => r.id)
  const { data: alloc } = ids.length
    ? await supabase.from('order_allocation_summary').select('order_id, units_needed, units_assigned').in('order_id', ids)
    : { data: [] as { order_id: string; units_needed: number; units_assigned: number }[] }
  const allocById = new Map((alloc ?? []).map((a) => [a.order_id, a]))

  const orders: CalendarOrder[] = rows.map((r) => {
    const a = allocById.get(r.id)
    const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
    return {
      id: r.id,
      order_code: r.order_code,
      status: r.status,
      setup_date: r.setup_date,
      start_date: r.start_date,
      end_date: r.end_date,
      destination: r.destination,
      customer: c?.name ?? '-',
      hasRental: (a?.units_needed ?? 0) > 0,
      missing: a ? a.units_needed - a.units_assigned : 0,
    }
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Kalender</h1>
        <p className="text-sm text-muted-foreground">Jadwal pemasangan, acara, pembongkaran, dan pengiriman penjualan.</p>
      </div>
      <CalendarMonth ym={ym} today={today} weeks={weeks} eventsByDate={buildEvents(orders, gridStart, gridEnd)} />
    </div>
  )
}
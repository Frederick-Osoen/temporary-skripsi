import { createAdminClient } from '@/lib/supabase/admin'
import { notifyFailure } from '@/lib/notify/events'
import { PICKUP_DESTINATION } from '@/lib/validations/order'
import { SITE, rupiah } from '@/lib/notify/templates'
import { calendarConfigured, createEvent, deleteEvent, updateEvent, type CalEvent } from './google'

// Warna Google Calendar: 9 Blueberry (biru), 6 Tangerine (oranye), 5 Banana (kuning)
export const KIND_COLOR = { setup: '9', sales_delivery: '6', store_pickup: '5' } as const
type Kind = keyof typeof KIND_COLOR
const NOTIFY_COOLDOWN_MS = 6 * 3600_000

type OrderRow = {
  id: string; order_code: string; status: string; start_date: string; end_date: string; setup_date: string
  destination: string; fleet_type: string; total_amount: number | string
  customers: { name: string; phone_number: string } | { name: string; phone_number: string }[] | null
  order_items: { qty: number; products: { name: string; category: string } | { name: string; category: string }[] | null }[]
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

function desiredEvent(o: OrderRow): { kind: Kind; event: CalEvent } | null {
  if (o.status === 'cancelled') return null
  const c = one(o.customers)
  const items = o.order_items.map((i) => ({ qty: i.qty, p: one(i.products) }))
  const hasRental = items.some((i) => i.p?.category === 'rental')
  const kind: Kind = hasRental ? 'setup' : o.destination === PICKUP_DESTINATION ? 'store_pickup' : 'sales_delivery'
  const date = kind === 'setup' ? o.setup_date : o.start_date
  const who = c?.name ?? 'Pelanggan'
  const label = { setup: 'Setup', sales_delivery: 'Kirim', store_pickup: 'Ambil di toko' }[kind]
  const description = [
    `Pesanan ${o.order_code}`,
    `Pelanggan: ${who}${c?.phone_number ? ` (${c.phone_number})` : ''}`,
    `Lokasi: ${o.destination}`,
    hasRental ? `Acara: ${o.start_date}${o.end_date !== o.start_date ? ` s/d ${o.end_date}` : ''}` : null,
    `Barang: ${items.map((i) => `${i.p?.name ?? '?'} ×${i.qty}`).join(', ')}`,
    `Total: ${rupiah(Number(o.total_amount))}`,
    `Status: ${o.status}`,
    `${SITE}/dashboard/orders/${o.id}`,
  ].filter(Boolean).join('\n')
  return { kind, event: { summary: `${label} · ${who} · ${o.destination}`, description, date, colorId: KIND_COLOR[kind], orderId: o.id } }
}

// Sinkron SATU pesanan ke Google Calendar. Tidak pernah melempar: kegagalan dicatat di calendar_sync
// dan diberitahukan lewat email (maksimal sekali per 6 jam per pesanan).
export async function syncOrderCalendar(orderId: string): Promise<void> {
  if (!calendarConfigured()) return
  const db = createAdminClient()
  try {
    const [{ data: order }, { data: row }] = await Promise.all([
      db.from('orders')
        .select('id, order_code, status, start_date, end_date, setup_date, destination, fleet_type, total_amount, customers(name, phone_number), order_items(qty, products(name, category))')
        .eq('id', orderId).maybeSingle(),
      db.from('calendar_sync').select('event_id, failure_notified_at').eq('order_id', orderId).maybeSingle(),
    ])
    const want = order ? desiredEvent(order as unknown as OrderRow) : null
    let eventId = row?.event_id ?? null

    try {
      if (!want) {
        if (eventId) await deleteEvent(eventId)
        await db.from('calendar_sync').upsert({ order_id: orderId, event_id: null, kind: null, status: 'removed', last_error: null, synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        return
      }
      eventId = eventId ? await updateEvent(eventId, want.event) : await createEvent(want.event)
      await db.from('calendar_sync').upsert({
        order_id: orderId, event_id: eventId, kind: want.kind, status: 'synced', last_error: null,
        synced_at: new Date().toISOString(), failure_notified_at: null, updated_at: new Date().toISOString(),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[calendar] sinkron gagal:', orderId, msg)
      const last = row?.failure_notified_at ? new Date(row.failure_notified_at).getTime() : 0
      const notify = Date.now() - last > NOTIFY_COOLDOWN_MS
      await db.from('calendar_sync').upsert({
        order_id: orderId, event_id: eventId, status: 'failed', last_error: msg.slice(0, 500),
        updated_at: new Date().toISOString(), ...(notify ? { failure_notified_at: new Date().toISOString() } : {}),
      })
      if (notify) await notifyFailure('Sinkron Google Calendar gagal', msg, orderId)
    }
  } catch (err) {
    console.error('[calendar] error tak terduga:', err)
  }
}

// Untuk cron harian: ulang yang gagal/tertunda, dan pastikan pesanan aktif mendatang punya event.
export async function retryPendingSyncs(): Promise<{ attempted: number }> {
  if (!calendarConfigured()) return { attempted: 0 }
  const db = createAdminClient()
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
  const [{ data: failed }, { data: upcoming }, { data: have }] = await Promise.all([
    db.from('calendar_sync').select('order_id').in('status', ['failed', 'pending']).limit(50),
    db.from('orders').select('id').gte('end_date', today).neq('status', 'cancelled').limit(200),
    db.from('calendar_sync').select('order_id').in('status', ['synced']).limit(1000),
  ])
  const synced = new Set((have ?? []).map((r) => r.order_id as string))
  const ids = new Set<string>((failed ?? []).map((r) => r.order_id as string))
  for (const o of upcoming ?? []) if (!synced.has(o.id as string)) ids.add(o.id as string)
  const list = Array.from(ids).slice(0, 40)
  for (const id of list) await syncOrderCalendar(id)
  return { attempted: list.length }
}

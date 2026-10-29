import { createAdminClient } from '@/lib/supabase/admin'
import { notifyFailure } from '@/lib/notify/events'
import { PICKUP_DESTINATION } from '@/lib/validations/order'
import { SITE, rupiah } from '@/lib/notify/templates'
import { calendarConfigured, createEvent, deleteEvent, updateEvent, type CalEvent } from './google'

// Warna Google Calendar: 9 Blueberry (biru), 6 Tangerine (oranye), 5 Banana (kuning), 8 Graphite (abu-abu)
// Warna sama dengan Kalender di dashboard: pasang biru, bongkar abu-abu, antar oranye, ambil kuning.
// Acara (Hari-H sampai hari selesai) hijau (10 Basil).
export const KIND_COLOR = { setup: '9', sales_delivery: '6', store_pickup: '5', teardown: '8', acara: '10' } as const
type Kind = Exclude<keyof typeof KIND_COLOR, 'teardown' | 'acara'>
const NOTIFY_COOLDOWN_MS = 6 * 3600_000

type OrderRow = {
  id: string; order_code: string; status: string; start_date: string; end_date: string; setup_date: string
  destination: string; fleet_type: string; total_amount: number | string
  customers: { name: string; phone_number: string } | { name: string; phone_number: string }[] | null
  order_items: { qty: number; products: { name: string; category: string } | { name: string; category: string }[] | null }[]
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export function desiredEvent(o: OrderRow): { kind: Kind; event: CalEvent } | null {
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

// Event bongkar: sehari setelah acara selesai (H+1), hanya untuk pesanan yang menyewa unit
export function desiredTeardown(o: OrderRow): CalEvent | null {
  if (o.status === 'cancelled') return null
  const hasRental = o.order_items.some((i) => one(i.products)?.category === 'rental')
  if (!hasRental) return null
  const c = one(o.customers)
  const who = c?.name ?? 'Pelanggan'
  const next = new Date(o.end_date + 'T00:00:00Z')
  next.setUTCDate(next.getUTCDate() + 1)
  const date = next.toISOString().slice(0, 10)
  const description = [
    `Pesanan ${o.order_code}`,
    `Pelanggan: ${who}${c?.phone_number ? ` (${c.phone_number})` : ''}`,
    `Lokasi: ${o.destination}`,
    `Acara selesai: ${o.end_date}. Kabari tim lapangan untuk mengangkut unit.`,
    `${SITE}/dashboard/orders/${o.id}`,
  ].join('\n')
  return { summary: `Bongkar · ${who} · ${o.destination}`, description, date, colorId: KIND_COLOR.teardown, orderId: o.id }
}

// Event acara: rentang Hari-H sampai hari selesai (satu event beberapa hari), hanya untuk pesanan yang menyewa unit.
// Dengan ini kalender menampilkan siklus lengkap: Setup (H-1) -> Acara (mulai-selesai) -> Bongkar (H+1 setelah selesai).
export function desiredAcara(o: OrderRow): CalEvent | null {
  if (o.status === 'cancelled') return null
  if (!o.order_items.some((i) => one(i.products)?.category === 'rental')) return null
  const c = one(o.customers)
  const who = c?.name ?? 'Pelanggan'
  const description = [
    `Pesanan ${o.order_code}`,
    `Pelanggan: ${who}${c?.phone_number ? ` (${c.phone_number})` : ''}`,
    `Lokasi: ${o.destination}`,
    `Acara: ${o.start_date}${o.end_date !== o.start_date ? ` s/d ${o.end_date}` : ''}`,
    `Barang: ${o.order_items.map((i) => `${one(i.products)?.name ?? '?'} ×${i.qty}`).join(', ')}`,
    `${SITE}/dashboard/orders/${o.id}`,
  ].join('\n')
  return { summary: `Acara · ${who} · ${o.destination}`, description, date: o.start_date, endDate: o.end_date, colorId: KIND_COLOR.acara, orderId: o.id }
}

// Kolom teardown_event_id ada setelah fase-9d.sql dijalankan. Sebelum itu, event bongkar dilewati (event pasang tetap jalan).
let teardownColumn: boolean | null = null
async function hasTeardownColumn(db: ReturnType<typeof createAdminClient>): Promise<boolean> {
  if (teardownColumn !== null) return teardownColumn
  const { error } = await db.from('calendar_sync').select('teardown_event_id').limit(1)
  teardownColumn = !error
  if (error) console.warn('[calendar] kolom teardown_event_id belum ada: jalankan fase-9d.sql untuk event Bongkar.')
  return teardownColumn
}

// Kolom acara_event_id ada setelah fase-10b.sql. Sebelum itu, event Acara dilewati.
let acaraColumn: boolean | null = null
async function hasAcaraColumn(db: ReturnType<typeof createAdminClient>): Promise<boolean> {
  if (acaraColumn !== null) return acaraColumn
  const { error } = await db.from('calendar_sync').select('acara_event_id').limit(1)
  acaraColumn = !error
  if (error) console.warn('[calendar] kolom acara_event_id belum ada: jalankan fase-10b.sql untuk event Acara.')
  return acaraColumn
}

// Sinkron SATU pesanan ke Google Calendar. Tidak pernah melempar: kegagalan dicatat di calendar_sync
// dan diberitahukan lewat email (maksimal sekali per 6 jam per pesanan).
export async function syncOrderCalendar(orderId: string): Promise<void> {
  if (!calendarConfigured()) return
  const db = createAdminClient()
  try {
    const teardownOk = await hasTeardownColumn(db)
    const acaraOk = await hasAcaraColumn(db)
    const [{ data: order }, { data: row }] = await Promise.all([
      db.from('orders')
        .select('id, order_code, status, start_date, end_date, setup_date, destination, fleet_type, total_amount, customers(name, phone_number), order_items(qty, products(name, category))')
        .eq('id', orderId).maybeSingle(),
      db.from('calendar_sync').select('*').eq('order_id', orderId).maybeSingle(),
    ])
    const want = order ? desiredEvent(order as unknown as OrderRow) : null
    let eventId = row?.event_id ?? null
    let teardownId: string | null = (row as { teardown_event_id?: string | null } | null)?.teardown_event_id ?? null
    let acaraId: string | null = (row as { acara_event_id?: string | null } | null)?.acara_event_id ?? null

    try {
      if (!want) {
        if (eventId) await deleteEvent(eventId)
        if (teardownId) await deleteEvent(teardownId)
        if (acaraId) await deleteEvent(acaraId)
        await db.from('calendar_sync').upsert({
          order_id: orderId, event_id: null, kind: null, status: 'removed', last_error: null,
          synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          ...(teardownOk ? { teardown_event_id: null } : {}),
          ...(acaraOk ? { acara_event_id: null } : {}),
        })
        return
      }
      eventId = eventId ? await updateEvent(eventId, want.event) : await createEvent(want.event)

      // Event bongkar (sewa saja): buat/ubah, atau hapus bila tidak lagi relevan
      if (teardownOk) {
        const tear = desiredTeardown(order as unknown as OrderRow)
        if (tear) teardownId = teardownId ? await updateEvent(teardownId, tear) : await createEvent(tear)
        else if (teardownId) { await deleteEvent(teardownId); teardownId = null }
      }

      // Event acara (sewa saja): buat/ubah, atau hapus bila tidak lagi relevan
      if (acaraOk) {
        const acara = desiredAcara(order as unknown as OrderRow)
        if (acara) acaraId = acaraId ? await updateEvent(acaraId, acara) : await createEvent(acara)
        else if (acaraId) { await deleteEvent(acaraId); acaraId = null }
      }

      await db.from('calendar_sync').upsert({
        order_id: orderId, event_id: eventId, kind: want.kind, status: 'synced', last_error: null,
        synced_at: new Date().toISOString(), failure_notified_at: null, updated_at: new Date().toISOString(),
        ...(teardownOk ? { teardown_event_id: teardownId } : {}),
        ...(acaraOk ? { acara_event_id: acaraId } : {}),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[calendar] sinkron gagal:', orderId, msg)
      const last = row?.failure_notified_at ? new Date(row.failure_notified_at).getTime() : 0
      const notify = Date.now() - last > NOTIFY_COOLDOWN_MS
      await db.from('calendar_sync').upsert({
        order_id: orderId, event_id: eventId, status: 'failed', last_error: msg.slice(0, 500),
        ...(teardownOk ? { teardown_event_id: teardownId } : {}),
        ...(acaraOk ? { acara_event_id: acaraId } : {}),
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

  // Pesanan sewa yang sudah tersinkron sebelum fase-9d belum punya event Bongkar: lengkapi (kind 'setup' = sewa)
  if (await hasTeardownColumn(db)) {
    const upcomingIds = new Set((upcoming ?? []).map((o) => o.id as string))
    const { data: noTear } = await db.from('calendar_sync').select('order_id').eq('status', 'synced').eq('kind', 'setup').is('teardown_event_id', null).limit(200)
    for (const r of noTear ?? []) if (upcomingIds.has(r.order_id as string)) ids.add(r.order_id as string)
  }
  // Pesanan sewa yang sudah tersinkron sebelum fase-10b belum punya event Acara: lengkapi
  if (await hasAcaraColumn(db)) {
    const upcomingIds = new Set((upcoming ?? []).map((o) => o.id as string))
    const { data: noAcara } = await db.from('calendar_sync').select('order_id').eq('status', 'synced').eq('kind', 'setup').is('acara_event_id', null).limit(200)
    for (const r of noAcara ?? []) if (upcomingIds.has(r.order_id as string)) ids.add(r.order_id as string)
  }
  const list = Array.from(ids).slice(0, 40)
  for (const id of list) await syncOrderCalendar(id)
  return { attempted: list.length }
}

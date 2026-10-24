import { createAdminClient } from '@/lib/supabase/admin'
import { retryPendingSyncs } from '@/lib/calendar/sync'
import { sendDailyDigest, type DigestOrder } from '@/lib/notify/events'
import { PICKUP_DESTINATION } from '@/lib/validations/order'

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Pekerjaan harian: 1) email ringkasan H-1/H-2  2) ulang sinkron kalender yang gagal.
// Dipanggil oleh cron (route) dan oleh tombol uji owner di Pengaturan.
export async function runDailyJob() {
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10) // WIB
  const d1 = addDays(today, 1)
  const d2 = addDays(today, 2)

  const { data, error } = await createAdminClient()
    .from('orders')
    .select('id, order_code, status, start_date, destination, customers(name, phone_number), order_items(products(category))')
    .in('start_date', [d1, d2])
    .not('status', 'in', '(cancelled,completed)')
  if (error) {
    console.error('[cron daily] query:', error.message)
    return { ok: false as const, error: error.message }
  }

  const list: DigestOrder[] = (data ?? []).map((o) => {
    const c = Array.isArray(o.customers) ? o.customers[0] : o.customers
    const items = (o.order_items ?? []) as { products: { category: string } | { category: string }[] | null }[]
    const hasRental = items.some((i) => (Array.isArray(i.products) ? i.products[0] : i.products)?.category === 'rental')
    return {
      id: o.id as string,
      code: o.order_code as string,
      customer: (c as { name?: string } | null)?.name ?? '-',
      phone: (c as { phone_number?: string } | null)?.phone_number ?? '-',
      dest: o.destination === PICKUP_DESTINATION ? 'Ambil di toko' : (o.destination as string),
      start: o.start_date as string,
      daysLeft: o.start_date === d1 ? 1 : 2,
      hasRental,
      status: o.status as string,
    }
  })

  const digest = await sendDailyDigest(list)
  const sync = await retryPendingSyncs()
  return { ok: true as const, orders: list.length, digest, sync }
}

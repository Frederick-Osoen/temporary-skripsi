import Link from 'next/link'
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, Inbox, Plus, TrendingUp, Wallet, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdmin } from '@/lib/auth'
import { buttonVariants } from '@/components/ui/button'
import { KIND_META, type CalendarKind } from '@/lib/calendar'
import { loadMaintenanceOverview } from '@/lib/maintenance-overview'
import { addDays, formatDate, formatRupiah, todayWIB } from '@/lib/orders/utils'
import { STATUS_LABEL, type OrderStatus } from '@/lib/orders/status'
import { PICKUP_DESTINATION } from '@/lib/validations/order'

export const metadata = { title: 'Ringkasan' }
export const dynamic = 'force-dynamic'

type ActiveOrder = {
  id: string
  order_code: string
  status: OrderStatus
  setup_date: string
  start_date: string
  end_date: string
  destination: string
  total_amount: number | string
  customers: { name: string } | { name: string }[] | null
}

const wibDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

function compactRupiah(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`
  return String(n)
}

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: string; hint?: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-4 shadow-xs">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground/80">{hint}</p>}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const admin = await getCurrentAdmin()
  const supabase = await createClient()

  const today = todayWIB()
  const [yy, mm] = today.split('-').map(Number)
  const monthStart = `${today.slice(0, 7)}-01`
  const monthEnd = new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10)
  const chartStart = new Date(Date.UTC(yy, mm - 1 - 5, 1)).toISOString().slice(0, 10)
  const weekAhead = addDays(today, 7)

  const [leadsRes, activeRes, paymentsRes, monthRes, maint] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase
      .from('orders')
      .select('id, order_code, status, setup_date, start_date, end_date, destination, total_amount, customers(name)')
      .not('status', 'in', '(completed,cancelled)')
      .order('start_date')
      .limit(500),
    supabase.from('payment_transactions').select('amount, payment_date').gte('payment_date', `${chartStart}T00:00:00+07:00`).limit(5000),
    supabase.from('orders').select('total_amount').neq('status', 'cancelled').gte('start_date', monthStart).lte('start_date', monthEnd).limit(5000),
    loadMaintenanceOverview(supabase),
  ])

  const partialError = !!(leadsRes.error || activeRes.error || paymentsRes.error || monthRes.error || maint.error)
  const newLeads = leadsRes.count ?? 0
  const active = (activeRes.data ?? []) as unknown as ActiveOrder[]

  // Alokasi unit untuk pesanan aktif
  const ids = active.map((o) => o.id)
  const { data: allocRows } = ids.length
    ? await supabase.from('order_allocation_summary').select('order_id, units_needed, units_assigned').in('order_id', ids)
    : { data: [] as { order_id: string; units_needed: number; units_assigned: number }[] }
  const missingById = new Map((allocRows ?? []).map((a) => [a.order_id, Math.max(0, a.units_needed - a.units_assigned)]))

  // ---- KPI ----
  const payments = (paymentsRes.data ?? []).map((p) => ({ amount: Number(p.amount), day: wibDate(p.payment_date as string) }))
  const paidThisMonth = payments.filter((p) => p.day >= monthStart && p.day <= monthEnd).reduce((s, p) => s + p.amount, 0)
  const orderValueThisMonth = (monthRes.data ?? []).reduce((s, o) => s + Number(o.total_amount), 0)

  // ---- Perlu tindakan ----
  const pendingDp = active.filter((o) => o.status === 'pending_dp').length
  const waitingPayment = active.filter((o) => o.status === 'waiting_payment').length
  const shortage = active.filter((o) => (missingById.get(o.id) ?? 0) > 0 && o.start_date <= weekAhead).length
  const maintDue = maint.units.filter((u) => u.alert.level !== 'ok').length

  const todo: { key: string; n: number; label: string; href: string; icon: LucideIcon; tone: string }[] = [
    { key: 'leads', n: newLeads, label: 'Lead baru menunggu', href: '/dashboard/leads', icon: Inbox, tone: 'text-sky-700 bg-sky-100' },
    { key: 'dp', n: pendingDp, label: 'Pesanan menunggu DP', href: '/dashboard/orders?status=pending_dp', icon: Wallet, tone: 'text-amber-700 bg-amber-100' },
    { key: 'unit', n: shortage, label: 'Unit belum lengkap (acara ≤ 7 hari)', href: '/dashboard/orders?status=active', icon: AlertTriangle, tone: 'text-red-700 bg-red-100' },
    { key: 'pay', n: waitingPayment, label: 'Menunggu pelunasan', href: '/dashboard/orders?status=waiting_payment', icon: Wallet, tone: 'text-orange-700 bg-orange-100' },
    { key: 'maint', n: maintDue, label: 'Unit AC perlu perawatan', href: '/dashboard/maintenance', icon: Wrench, tone: 'text-violet-700 bg-violet-100' },
  ].filter((t) => t.n > 0)

  // ---- Jadwal 7 hari ke depan ----
  type Entry = { order: ActiveOrder; date: string; kind: CalendarKind; running: boolean }
  const schedule: Entry[] = []
  for (const o of active) {
    const isRental = o.setup_date !== o.start_date
    if (o.start_date <= today && o.end_date >= today && isRental) {
      schedule.push({ order: o, date: today, kind: 'event', running: true })
      continue
    }
    const candidates: { date: string; kind: CalendarKind }[] = []
    if (isRental) {
      candidates.push({ date: o.setup_date, kind: 'setup' }, { date: o.start_date, kind: 'event' })
    } else {
      candidates.push({ date: o.start_date, kind: o.destination === PICKUP_DESTINATION ? 'store_pickup' : 'sales_delivery' })
    }
    const next = candidates.filter((c) => c.date >= today && c.date <= weekAhead).sort((a, b) => a.date.localeCompare(b.date))[0]
    if (next) schedule.push({ order: o, date: next.date, kind: next.kind, running: false })
  }
  schedule.sort((a, b) => a.date.localeCompare(b.date) || a.order.order_code.localeCompare(b.order.order_code))
  const scheduleShown = schedule.slice(0, 8)

  // ---- Grafik pembayaran 6 bulan ----
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(yy, mm - 1 - (5 - i), 1))
    const key = d.toISOString().slice(0, 7)
    return {
      key,
      label: new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' }).format(d),
      total: payments.filter((p) => p.day.startsWith(key)).reduce((s, p) => s + p.amount, 0),
    }
  })
  const maxMonth = Math.max(1, ...months.map((m) => m.total))

  const greeting = admin.ok ? `Halo, ${admin.name}` : 'Halo'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{greeting}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(today)} · ringkasan operasional JJ Teknik</p>
        </div>
        <Link href="/dashboard/orders/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Pesanan Baru
        </Link>
      </div>

      {partialError && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sebagian data gagal dimuat (koneksi database). Angka di bawah mungkin belum lengkap, muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={ClipboardList} label="Pesanan aktif" value={String(active.length)} tone="bg-primary/10 text-primary" />
        <Kpi icon={Inbox} label="Lead baru" value={String(newLeads)} tone="bg-sky-100 text-sky-700" />
        <Kpi icon={Wallet} label="Pembayaran masuk bulan ini" value={formatRupiah(paidThisMonth)} tone="bg-green-100 text-green-700" />
        <Kpi icon={TrendingUp} label="Nilai pesanan bulan ini" value={formatRupiah(orderValueThisMonth)} hint="acara berlangsung bulan ini" tone="bg-volt/20 text-warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Perlu tindakan */}
        <section aria-labelledby="todo" className="space-y-3 rounded-xl border bg-background p-4 lg:col-span-1">
          <h2 id="todo" className="text-sm font-semibold">Perlu tindakan</h2>
          {todo.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Semua beres. Tidak ada yang perlu ditindak.
            </p>
          ) : (
            <ul className="space-y-2">
              {todo.map((t) => (
                <li key={t.key}>
                  <Link href={t.href} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.tone}`}>
                      <t.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-sm">{t.label}</span>
                    <span className="text-lg font-bold tabular-nums">{t.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Jadwal */}
        <section aria-labelledby="jadwal" className="space-y-3 rounded-xl border bg-background p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 id="jadwal" className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" /> Jadwal 7 hari ke depan
            </h2>
            <Link href="/dashboard/calendar" className="text-xs text-primary hover:underline">Buka kalender</Link>
          </div>
          {scheduleShown.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">Tidak ada pemasangan atau acara dalam 7 hari ke depan.</p>
          ) : (
            <ul className="divide-y">
              {scheduleShown.map((e) => {
                const meta = KIND_META[e.kind]
                const c = Array.isArray(e.order.customers) ? e.order.customers[0] : e.order.customers
                const missing = missingById.get(e.order.id) ?? 0
                return (
                  <li key={`${e.order.id}:${e.kind}`}>
                    <Link href={`/dashboard/orders/${e.order.id}`} className="flex items-center gap-3 py-2.5 hover:bg-muted/40">
                      <span className={`w-20 shrink-0 rounded-md border px-2 py-1 text-center text-[11px] font-medium ${meta.chip}`}>
                        {e.running ? 'Berlangsung' : meta.short}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{e.order.order_code} · {c?.name ?? '-'}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {e.running ? `s/d ${formatDate(e.order.end_date)}` : e.date === today ? 'Hari ini' : formatDate(e.date)} · {e.order.destination}
                        </span>
                      </span>
                      {missing > 0 && <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">Kurang {missing}</span>}
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{STATUS_LABEL[e.order.status]}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {schedule.length > scheduleShown.length && (
            <p className="text-xs text-muted-foreground">+{schedule.length - scheduleShown.length} jadwal lain di kalender.</p>
          )}
        </section>
      </div>

      {/* Grafik pembayaran */}
      <section aria-labelledby="grafik" className="space-y-3 rounded-xl border bg-background p-4">
        <h2 id="grafik" className="text-sm font-semibold">Pembayaran masuk, 6 bulan terakhir</h2>
        <div className="flex h-40 items-end gap-2 sm:gap-4" role="img" aria-label={`Pembayaran masuk per bulan: ${months.map((m) => `${m.label} ${formatRupiah(m.total)}`).join(', ')}`}>
          {months.map((m, i) => (
            <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] tabular-nums text-muted-foreground">{m.total > 0 ? compactRupiah(m.total) : ''}</span>
              <div
                className={`w-full max-w-14 rounded-t-md ${i === months.length - 1 ? 'bg-primary' : 'bg-primary/35'}`}
                style={{ height: `${Math.max(m.total > 0 ? 4 : 1, Math.round((m.total / maxMonth) * 100))}%` }}
              />
              <span className="text-xs capitalize text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

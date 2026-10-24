import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Inbox, Wallet, Wrench, Hammer, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdmin } from '@/lib/auth'
import { KIND_META, buildEvents, type CalendarOrder } from '@/lib/calendar'
import { loadMaintenanceOverview } from '@/lib/maintenance-overview'
import { addDays, formatRupiah, todayWIB } from '@/lib/orders/utils'
import type { OrderStatus } from '@/lib/orders/status'
import { CountUp } from '@/components/dashboard/overview/count-up'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Ringkasan' }
export const dynamic = 'force-dynamic'

type OrderRow = {
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

const ORDER_COLS = 'id, order_code, status, setup_date, start_date, end_date, destination, total_amount, customers(name)'
const wibDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
const custName = (o: OrderRow) => (Array.isArray(o.customers) ? o.customers[0]?.name : o.customers?.name) ?? '-'

function compactRupiah(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (n >= 1_000) return `${Math.round(n / 1_000)} rb`
  return String(n)
}

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }))
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'
}

const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' })
const longFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`)

// Satu angka di pita "Hari ini"
function TodayStat({ n, label, href, delay }: { n: number; label: string; href: string; delay: number }) {
  return (
    <Link
      href={href}
      className="dash-in group flex flex-col justify-between gap-1 px-4 py-3 transition-colors hover:bg-white/5 focus-visible:bg-white/10 focus-visible:outline-none sm:px-5 sm:py-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className={cn('font-heading text-3xl font-bold leading-none sm:text-4xl', n === 0 ? 'text-white/35' : 'text-white')}>
        <CountUp value={n} duration={600} />
      </span>
      <span className="text-xs text-sidebar-foreground/75 group-hover:text-white">{label}</span>
    </Link>
  )
}

export default async function DashboardPage() {
  const admin = await getCurrentAdmin()
  const supabase = await createClient()

  const today = todayWIB()
  const weekEnd = addDays(today, 6)
  const [yy, mm] = today.split('-').map(Number)
  const monthStart = `${today.slice(0, 7)}-01`
  const monthEnd = new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10)
  const prevMonth = new Date(Date.UTC(yy, mm - 2, 1)).toISOString().slice(0, 7)
  const chartStart = new Date(Date.UTC(yy, mm - 1 - 5, 1)).toISOString().slice(0, 10)

  const [leadsRes, activeRes, boardRes, paymentsRes, monthRes, maint] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('orders').select(ORDER_COLS).not('status', 'in', '(completed,cancelled)').order('start_date').limit(500),
    // Papan 7 hari: termasuk pesanan yang sudah selesai agar jadwal bongkar tetap tampil
    supabase.from('orders').select(ORDER_COLS).neq('status', 'cancelled').gte('end_date', addDays(today, -1)).lte('setup_date', weekEnd).limit(500),
    supabase.from('payment_transactions').select('amount, payment_date').gte('payment_date', `${chartStart}T00:00:00+07:00`).limit(5000),
    supabase.from('orders').select('total_amount').neq('status', 'cancelled').gte('start_date', monthStart).lte('start_date', monthEnd).limit(5000),
    loadMaintenanceOverview(supabase),
  ])

  const active = (activeRes.data ?? []) as unknown as OrderRow[]
  const boardOrders = (boardRes.data ?? []) as unknown as OrderRow[]
  const newLeads = leadsRes.count ?? 0

  // Alokasi unit & pembayaran untuk pesanan yang relevan
  const ids = [...new Set([...active, ...boardOrders].map((o) => o.id))]
  const activeIds = active.map((o) => o.id)
  const [allocRes, paidRes] = await Promise.all([
    ids.length
      ? supabase.from('order_allocation_summary').select('order_id, units_needed, units_assigned').in('order_id', ids)
      : Promise.resolve({ data: [] as { order_id: string; units_needed: number; units_assigned: number }[], error: null }),
    activeIds.length
      ? supabase.from('payment_transactions').select('order_id, amount').in('order_id', activeIds).limit(5000)
      : Promise.resolve({ data: [] as { order_id: string; amount: number }[], error: null }),
  ])
  const partialError = !!(leadsRes.error || activeRes.error || boardRes.error || paymentsRes.error || monthRes.error || maint.error || allocRes.error || paidRes.error)
  const missingById = new Map((allocRes.data ?? []).map((a) => [a.order_id, Math.max(0, a.units_needed - a.units_assigned)]))

  // ---- Papan 7 hari (sama dengan logika Kalender) ----
  const calOrders: CalendarOrder[] = boardOrders.map((o) => ({
    id: o.id, order_code: o.order_code, status: o.status, setup_date: o.setup_date, start_date: o.start_date,
    end_date: o.end_date, destination: o.destination, customer: custName(o),
    hasRental: o.setup_date !== o.start_date, missing: missingById.get(o.id) ?? 0,
  }))
  const byDate = buildEvents(calOrders, today, weekEnd)
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const todays = byDate[today] ?? []
  const countKind = (k: string) => todays.filter((e) => e.kind === k).length

  // ---- Keuangan ----
  const payments = (paymentsRes.data ?? []).map((p) => ({ amount: Number(p.amount), day: wibDate(p.payment_date as string) }))
  const paidThisMonth = payments.filter((p) => p.day >= monthStart && p.day <= monthEnd).reduce((s, p) => s + p.amount, 0)
  const paidPrevMonth = payments.filter((p) => p.day.startsWith(prevMonth)).reduce((s, p) => s + p.amount, 0)
  const delta = paidPrevMonth > 0 ? Math.round(((paidThisMonth - paidPrevMonth) / paidPrevMonth) * 100) : null
  const orderValueThisMonth = (monthRes.data ?? []).reduce((s, o) => s + Number(o.total_amount), 0)

  const paidByOrder = new Map<string, number>()
  for (const p of paidRes.data ?? []) paidByOrder.set(p.order_id, (paidByOrder.get(p.order_id) ?? 0) + Number(p.amount))
  const receivables = active
    .map((o) => ({ o, rest: Math.max(0, Number(o.total_amount) - (paidByOrder.get(o.id) ?? 0)) }))
    .filter((r) => r.rest > 0)
  const receivableTotal = receivables.reduce((s, r) => s + r.rest, 0)

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

  // ---- Perlu tindakan ----
  const weekAhead = addDays(today, 7)
  const pendingDp = active.filter((o) => o.status === 'pending_dp').length
  const waitingPayment = active.filter((o) => o.status === 'waiting_payment').length
  const shortage = active.filter((o) => (missingById.get(o.id) ?? 0) > 0 && o.start_date <= weekAhead).length
  const down = maint.units.filter((u) => u.status === 'damaged' || u.status === 'maintenance').length
  const maintDue = maint.units.filter((u) => u.status !== 'damaged' && u.status !== 'maintenance' && u.alert.level !== 'ok').length

  const todo: { key: string; n: number; label: string; hint: string; href: string; icon: LucideIcon; tone: string }[] = [
    { key: 'unit', n: shortage, label: 'Unit belum lengkap', hint: 'acara dalam 7 hari', href: '/dashboard/orders?status=active', icon: AlertTriangle, tone: 'text-red-700 bg-red-100' },
    { key: 'leads', n: newLeads, label: 'Lead baru', hint: 'belum dihubungi', href: '/dashboard/leads', icon: Inbox, tone: 'text-sky-700 bg-sky-100' },
    { key: 'dp', n: pendingDp, label: 'Menunggu DP', hint: 'ingatkan pelanggan', href: '/dashboard/orders?status=pending_dp', icon: Wallet, tone: 'text-amber-700 bg-amber-100' },
    { key: 'pay', n: waitingPayment, label: 'Menunggu pelunasan', hint: 'acara sudah selesai', href: '/dashboard/orders?status=waiting_payment', icon: Wallet, tone: 'text-orange-700 bg-orange-100' },
    { key: 'down', n: down, label: 'Unit rusak / diservis', hint: 'tidak bisa disewakan', href: '/dashboard/maintenance', icon: Hammer, tone: 'text-rose-700 bg-rose-100' },
    { key: 'maint', n: maintDue, label: 'Perawatan jatuh tempo', hint: 'cuci / service AC', href: '/dashboard/maintenance', icon: Wrench, tone: 'text-violet-700 bg-violet-100' },
  ].filter((t) => t.n > 0)

  const firstName = admin.ok ? admin.name.split(/\s+/)[0] : ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
        <p className="text-sm text-muted-foreground">{longFmt.format(utc(today))}</p>
      </div>

      {partialError && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Sebagian data gagal dimuat (koneksi database). Angka di bawah mungkin belum lengkap. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}

      {/* Pita "Hari ini": satu-satunya blok gelap, jawaban untuk "apa yang terjadi hari ini?" */}
      <section aria-labelledby="hari-ini" className="overflow-hidden rounded-2xl bg-sidebar text-sidebar-foreground shadow-sm">
        <h2 id="hari-ini" className="px-4 pt-4 text-sm font-semibold text-white sm:px-5">Hari ini</h2>
        <div className="mt-2 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4 [&>*]:bg-sidebar">
          <TodayStat n={countKind('setup')} label="Pemasangan" href="/dashboard/calendar" delay={0} />
          <TodayStat n={countKind('event')} label="Acara berjalan" href="/dashboard/calendar" delay={60} />
          <TodayStat n={countKind('teardown')} label="Pembongkaran" href="/dashboard/calendar" delay={120} />
          <TodayStat n={newLeads} label="Lead baru" href="/dashboard/leads" delay={180} />
        </div>
      </section>

      {/* Papan 7 hari */}
      <section aria-labelledby="papan" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="papan" className="text-base font-semibold">Seminggu ke depan</h2>
          <Link href="/dashboard/calendar" className="text-sm font-medium text-primary hover:underline">Buka kalender</Link>
        </div>
        <ol className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-7 md:overflow-visible md:px-0 md:pb-0">
          {days.map((d, i) => {
            const list = byDate[d] ?? []
            const isToday = i === 0
            const shown = list.slice(0, 4)
            return (
              <li
                key={d}
                className={cn(
                  'dash-in flex w-40 shrink-0 snap-start flex-col rounded-xl border bg-background md:w-auto',
                  isToday && 'border-primary/50 ring-1 ring-primary/30'
                )}
                style={{ animationDelay: `${200 + i * 50}ms` }}
              >
                <div className={cn('flex items-baseline justify-between rounded-t-xl px-3 py-2', isToday ? 'bg-primary text-primary-foreground' : 'border-b')}>
                  <span className="text-xs font-medium">{isToday ? 'Hari ini' : i === 1 ? 'Besok' : dayFmt.format(utc(d))}</span>
                  <span className="font-heading text-lg font-bold leading-none tabular-nums">{Number(d.slice(8))}</span>
                </div>
                {list.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center px-3 py-6 text-xs text-muted-foreground/70">Kosong</p>
                ) : (
                  <ul className="flex-1 space-y-1.5 p-2">
                    {shown.map((e) => (
                      <li key={e.key}>
                        <Link
                          href={`/dashboard/orders/${e.order_id}`}
                          className="group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted"
                          title={`${KIND_META[e.kind].label}: ${e.order_code}, ${e.customer}`}
                        >
                          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', KIND_META[e.kind].dot)} aria-hidden="true" />
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block text-[11px] text-muted-foreground">{KIND_META[e.kind].short}</span>
                            <span className="block truncate text-xs font-medium group-hover:text-primary">{e.customer}</span>
                          </span>
                          {e.warn && <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-red-600" aria-label="Unit belum lengkap" />}
                        </Link>
                      </li>
                    ))}
                    {list.length > shown.length && (
                      <li>
                        <Link href={`/dashboard/calendar?m=${d.slice(0, 7)}`} className="block px-1.5 text-[11px] font-medium text-primary hover:underline">
                          +{list.length - shown.length} lainnya
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Keterangan warna">
          {(['setup', 'event', 'teardown', 'sales_delivery', 'store_pickup'] as const).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', KIND_META[k].dot)} aria-hidden="true" /> {KIND_META[k].short}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Perlu tindakan */}
        <section aria-labelledby="todo" className="space-y-3 rounded-2xl border bg-background p-4 lg:col-span-2">
          <h2 id="todo" className="text-base font-semibold">Perlu tindakan</h2>
          {todo.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> Tidak ada yang perlu ditindak sekarang.
            </p>
          ) : (
            <ul className="divide-y">
              {todo.map((t) => (
                <li key={t.key}>
                  <Link href={t.href} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.tone}`}>
                      <t.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block text-sm font-medium">{t.label}</span>
                      <span className="block text-xs text-muted-foreground">{t.hint}</span>
                    </span>
                    <span className="font-heading text-xl font-bold tabular-nums">{t.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Keuangan */}
        <section aria-labelledby="uang" className="space-y-4 rounded-2xl border bg-background p-4 lg:col-span-3">
          <h2 id="uang" className="text-base font-semibold">Keuangan</h2>
          <dl className="grid gap-4 sm:grid-cols-3 sm:divide-x">
            <div className="space-y-1">
              <dt className="text-xs text-muted-foreground">Uang masuk bulan ini</dt>
              <dd className="font-heading text-xl font-bold"><CountUp value={paidThisMonth} format="rupiah" /></dd>
              {delta !== null && (
                <dd className={cn('flex items-center gap-1 text-xs font-medium', delta >= 0 ? 'text-green-700' : 'text-red-700')}>
                  {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}
                  {delta >= 0 ? '+' : ''}{delta}% dari bulan lalu
                </dd>
              )}
            </div>
            <div className="space-y-1 sm:pl-4">
              <dt className="text-xs text-muted-foreground">Nilai pesanan bulan ini</dt>
              <dd className="font-heading text-xl font-bold"><CountUp value={orderValueThisMonth} format="rupiah" /></dd>
              <dd className="text-xs text-muted-foreground">acara yang mulai bulan ini</dd>
            </div>
            <div className="space-y-1 sm:pl-4">
              <dt className="text-xs text-muted-foreground">Belum dibayar</dt>
              <dd className="font-heading text-xl font-bold"><CountUp value={receivableTotal} format="rupiah" /></dd>
              <dd className="text-xs text-muted-foreground">dari {receivables.length} pesanan aktif</dd>
            </div>
          </dl>

          <div className="border-t pt-4">
            <p className="mb-3 text-xs text-muted-foreground">Uang masuk per bulan</p>
            <div
              className="flex h-36 items-end gap-2 sm:gap-4"
              role="img"
              aria-label={`Uang masuk per bulan: ${months.map((m) => `${m.label} ${formatRupiah(m.total)}`).join(', ')}`}
            >
              {months.map((m, i) => {
                const current = i === months.length - 1
                return (
                  <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className={cn('text-[11px] tabular-nums', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      {m.total > 0 ? compactRupiah(m.total) : ''}
                    </span>
                    <div
                      className={cn('dash-rise w-full max-w-12 rounded-t-md', current ? 'bg-primary' : 'bg-primary/30')}
                      style={{ height: `${Math.max(m.total > 0 ? 4 : 1, Math.round((m.total / maxMonth) * 100))}%`, animationDelay: `${400 + i * 70}ms` }}
                    />
                    <span className={cn('text-xs capitalize', current ? 'font-semibold' : 'text-muted-foreground')}>{m.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

import Link from 'next/link'
import { Download, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatRupiah } from '@/lib/orders/utils'
import { normalizePhone } from '@/lib/phone'
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from '@/lib/orders/status'
import { OrderStatusBadge } from '@/components/dashboard/orders/status-badge'

const PAGE_SIZE = 20
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type Row = {
  id: string
  order_code: string
  start_date: string
  end_date: string
  destination: string
  fleet_type: string
  total_amount: number | string
  status: string
  customers: { name: string; phone_number: string } | { name: string; phone_number: string }[] | null
}

type SearchParams = {
  created?: string
  status?: string
  q?: string
  from?: string
  to?: string
  sort?: string
  page?: string
}

const selectClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Buang karakter yang bermakna khusus di filter PostgREST (mencegah injeksi pada string .or())
const cleanQuery = (q: string) => q.replace(/[%,()*\\"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)

function AllocationBadge({ needed, assigned, status }: { needed?: number; assigned?: number; status: string }) {
  if (needed === undefined || assigned === undefined || needed === 0 || status === 'completed' || status === 'cancelled') {
    return <span className="text-muted-foreground">-</span>
  }
  const missing = needed - assigned
  return missing <= 0
    ? <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800">Lengkap</Badge>
    : <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">Kurang {missing}</Badge>
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams

  const status = sp.status && (sp.status === 'active' || (ORDER_STATUSES as readonly string[]).includes(sp.status)) ? sp.status : 'all'
  const q = cleanQuery(sp.q ?? '')
  const from = sp.from && DATE_RE.test(sp.from) ? sp.from : ''
  const to = sp.to && DATE_RE.test(sp.to) ? sp.to : ''
  const sort = sp.sort === 'event' ? 'event' : 'new'
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1)

  const supabase = await createClient()

  // Hitungan per status untuk chip filter (satu query ringan: hanya kolom status)
  const { data: statusRows } = await supabase.from('orders').select('status').limit(5000)
  const counts: Record<string, number> = {}
  for (const r of statusRows ?? []) counts[r.status as string] = (counts[r.status as string] ?? 0) + 1
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const active = total - (counts.completed ?? 0) - (counts.cancelled ?? 0)

  // Pencarian: kode pesanan, tujuan, nama/telepon pelanggan
  let orFilter: string | null = null
  if (q) {
    const parts = [`order_code.ilike.%${q}%`, `destination.ilike.%${q}%`]
    const custOr = [`name.ilike.%${q}%`, `phone_number.ilike.%${q}%`]
    const norm = q.replace(/\D/g, '').length >= 5 ? normalizePhone(q) : null
    if (norm) custOr.push(`phone_number.ilike.%${norm}%`)
    const { data: custs } = await supabase.from('customers').select('id').or(custOr.join(',')).limit(50)
    if (custs?.length) parts.push(`customer_id.in.(${custs.map((c) => c.id).join(',')})`)
    orFilter = parts.join(',')
  }

  let query = supabase
    .from('orders')
    .select('id, order_code, start_date, end_date, destination, fleet_type, total_amount, status, customers(name, phone_number)', { count: 'exact' })

  if (status === 'active') query = query.not('status', 'in', '(completed,cancelled)')
  else if (status !== 'all') query = query.eq('status', status)
  if (orFilter) query = query.or(orFilter)
  if (from) query = query.gte('end_date', from)
  if (to) query = query.lte('start_date', to)

  query = sort === 'event'
    ? query.order('start_date', { ascending: false }).order('created_at', { ascending: false })
    : query.order('created_at', { ascending: false })

  const { data, error, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  // Halaman di luar jumlah data (mis. filter berubah saat di halaman 5): kembali ke halaman pertama
  if (error?.code === 'PGRST103') {
    return (
      <p className="text-sm text-muted-foreground">
        Halaman ini tidak tersedia. <Link href="/dashboard/orders" className="text-primary underline">Kembali ke halaman pertama</Link>
      </p>
    )
  }
  if (error) return <p className="text-sm text-destructive">Gagal memuat pesanan: {error.message}</p>
  const orders = (data ?? []) as unknown as Row[]
  const matched = count ?? orders.length
  const pages = Math.max(1, Math.ceil(matched / PAGE_SIZE))

  const ids = orders.map((o) => o.id)
  const { data: allocRows } = ids.length
    ? await supabase.from('order_allocation_summary').select('order_id, units_needed, units_assigned').in('order_id', ids)
    : { data: [] as { order_id: string; units_needed: number; units_assigned: number }[] }
  const allocById = new Map((allocRows ?? []).map((a) => [a.order_id, a]))

  // Bangun URL yang mempertahankan filter lain
  const href = (over: Partial<Record<keyof SearchParams, string>>) => {
    const merged: Record<string, string> = { status, q, from, to, sort, page: '1', ...over }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (!v || (k === 'status' && v === 'all') || (k === 'sort' && v === 'new') || (k === 'page' && v === '1')) continue
      params.set(k, v)
    }
    const s = params.toString()
    return s ? `/dashboard/orders?${s}` : '/dashboard/orders'
  }

  const chips: { key: string; label: string; n: number }[] = [
    { key: 'all', label: 'Semua', n: total },
    { key: 'active', label: 'Aktif', n: active },
    ...ORDER_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s as OrderStatus], n: counts[s] ?? 0 })),
  ]
  const hasFilter = !!(q || from || to || status !== 'all' || sort !== 'new')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pesanan</h1>
          <p className="text-sm text-muted-foreground">{matched} pesanan{hasFilter ? ' sesuai filter' : ''}.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/dashboard/orders/export${sp.status && sp.status !== 'all' && sp.status !== 'active' ? `?status=${sp.status}` : ''}`} className={buttonVariants({ variant: 'outline' })}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </a>
          <Link href="/dashboard/orders/new" className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" /> Pesanan Baru
          </Link>
        </div>
      </div>

      {sp.created && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Pesanan <strong>{sp.created}</strong> berhasil disimpan.
        </p>
      )}

      {/* Chip status: bisa digeser di HP */}
      <nav aria-label="Filter status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {chips.map((c) => {
          const on = status === c.key
          return (
            <Link
              key={c.key}
              href={href({ status: c.key })}
              aria-current={on ? 'true' : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'
              }`}
            >
              {c.label}
              <span className={`text-xs tabular-nums ${on ? 'opacity-80' : 'text-muted-foreground'}`}>{c.n}</span>
            </Link>
          )
        })}
      </nav>

      {/* Pencarian, rentang tanggal acara, urutan (GET: URL bisa dibagikan, tanpa JS) */}
      <form method="get" action="/dashboard/orders" className="grid gap-2 rounded-xl border bg-background p-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]">
        {status !== 'all' && <input type="hidden" name="status" value={status} />}
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input name="q" defaultValue={q} placeholder="Cari kode, nama, telepon, atau tujuan..." className="pl-8" aria-label="Cari pesanan" />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Acara dari
          <Input type="date" name="from" defaultValue={from} className="w-auto" />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          sampai
          <Input type="date" name="to" defaultValue={to} className="w-auto" />
        </label>
        <select name="sort" defaultValue={sort} className={selectClass} aria-label="Urutkan">
          <option value="new">Terbaru dibuat</option>
          <option value="event">Tanggal acara terbaru</option>
        </select>
        <div className="flex gap-2">
          <Button type="submit">Terapkan</Button>
          {hasFilter && <Link href="/dashboard/orders" className={buttonVariants({ variant: 'outline' })}>Reset</Link>}
        </div>
      </form>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-background py-12 text-center text-sm text-muted-foreground">
          {hasFilter ? 'Tidak ada pesanan yang cocok dengan filter.' : 'Belum ada pesanan.'}
        </p>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="hidden overflow-x-auto rounded-xl border bg-background md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tujuan</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const c = Array.isArray(o.customers) ? o.customers[0] : o.customers
                  const a = allocById.get(o.id)
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        <Link href={`/dashboard/orders/${o.id}`} className="text-primary hover:underline">{o.order_code}</Link>
                      </TableCell>
                      <TableCell>
                        <div>{c?.name ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">{c?.phone_number}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(o.start_date)}
                        {o.end_date !== o.start_date && <> – {formatDate(o.end_date)}</>}
                      </TableCell>
                      <TableCell className="max-w-56 truncate">{o.destination}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatRupiah(Number(o.total_amount))}</TableCell>
                      <TableCell><AllocationBadge needed={a?.units_needed} assigned={a?.units_assigned} status={o.status} /></TableCell>
                      <TableCell><OrderStatusBadge status={o.status as OrderStatus} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: kartu */}
          <ul className="space-y-2 md:hidden">
            {orders.map((o) => {
              const c = Array.isArray(o.customers) ? o.customers[0] : o.customers
              const a = allocById.get(o.id)
              return (
                <li key={o.id}>
                  <Link href={`/dashboard/orders/${o.id}`} className="block rounded-xl border bg-background p-3 shadow-xs active:bg-muted/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-primary">{o.order_code}</p>
                        <p className="truncate text-sm">{c?.name ?? '-'}</p>
                      </div>
                      <OrderStatusBadge status={o.status as OrderStatus} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(o.start_date)}
                      {o.end_date !== o.start_date && <> – {formatDate(o.end_date)}</>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{o.destination}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold tabular-nums">{formatRupiah(Number(o.total_amount))}</span>
                      <AllocationBadge needed={a?.units_needed} assigned={a?.units_assigned} status={o.status} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* Paginasi */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Halaman {Math.min(page, pages)} dari {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={href({ page: String(page - 1) })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Sebelumnya</Link>}
            {page < pages && <Link href={href({ page: String(page + 1) })} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Berikutnya</Link>}
          </div>
        </div>
      )}
    </div>
  )
}

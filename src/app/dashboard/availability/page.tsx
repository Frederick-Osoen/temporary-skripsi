import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { addDays, todayWIB } from '@/lib/orders/utils'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const DAYS = 14
const iso = /^\d{4}-\d{2}-\d{2}$/
const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from: fromRaw } = await searchParams
  const from = fromRaw && iso.test(fromRaw) && !Number.isNaN(Date.parse(fromRaw)) ? fromRaw : todayWIB()
  const to = addDays(from, DAYS - 1)
  const dates = Array.from({ length: DAYS }, (_, i) => addDays(from, i))

  const supabase = await createClient()
  const [prodRes, unitRes, ordRes] = await Promise.all([
    supabase.from('products').select('id, name').eq('category', 'rental').order('name'),
    supabase.from('unit_assets').select('product_id, status'),
    supabase
      .from('orders')
      .select('order_code, setup_date, end_date, order_items(product_id, qty)')
      .not('status', 'in', '(completed,cancelled)')
      .lte('setup_date', to)
      .gte('end_date', from)
      .limit(1000),
  ])
  const err = prodRes.error ?? unitRes.error ?? ordRes.error
  if (err) return <p className="text-sm text-destructive">Gagal memuat ketersediaan: {err.message}</p>

  // Unit yang bisa dipakai (tidak rusak / maintenance)
  const usable = new Map<string, number>()
  for (const u of unitRes.data ?? []) {
    if (u.status === 'maintenance' || u.status === 'damaged') continue
    usable.set(u.product_id, (usable.get(u.product_id) ?? 0) + 1)
  }

  // Kebutuhan per produk per tanggal (setup H-1 sampai hari akhir)
  const need = new Map<string, Map<string, number>>()
  for (const o of ordRes.data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = ((o as any).order_items ?? []) as { product_id: string; qty: number }[]
    for (const d of dates) {
      if (d < o.setup_date || d > o.end_date) continue
      for (const it of items) {
        const m = need.get(it.product_id) ?? new Map<string, number>()
        m.set(d, (m.get(d) ?? 0) + Number(it.qty))
        need.set(it.product_id, m)
      }
    }
  }

  const products = prodRes.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Ketersediaan Unit</h1>
          <p className="text-sm text-muted-foreground">
            Sisa unit per hari = unit siap pakai dikurangi kebutuhan pesanan aktif (termasuk hari pemasangan). Khusus admin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/availability?from=${addDays(from, -DAYS)}`} className={buttonVariants({ variant: 'outline', size: 'sm' })} aria-label="14 hari sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href="/dashboard/availability" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Hari ini</Link>
          <Link href={`/dashboard/availability?from=${addDays(from, DAYS)}`} className={buttonVariants({ variant: 'outline', size: 'sm' })} aria-label="14 hari berikutnya">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-background py-10 text-center text-sm text-muted-foreground">Belum ada produk sewa.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs">
                <th scope="col" className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-medium">Produk</th>
                {dates.map((d) => (
                  <th key={d} scope="col" className={cn('px-1.5 py-2 text-center font-medium', d === todayWIB() && 'text-primary')}>
                    {dayFmt.format(new Date(`${d}T00:00:00Z`))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const total = usable.get(p.id) ?? 0
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <th scope="row" className="sticky left-0 z-10 bg-background px-3 py-2 text-left font-medium">
                      {p.name}
                      <span className="block text-xs font-normal text-muted-foreground">{total} unit siap</span>
                    </th>
                    {dates.map((d) => {
                      const used = need.get(p.id)?.get(d) ?? 0
                      const left = total - used
                      return (
                        <td key={d} className="px-1.5 py-1.5 text-center">
                          <span
                            title={`${used} dipakai dari ${total}`}
                            className={cn(
                              'inline-block min-w-9 rounded-md px-1.5 py-1 text-xs font-semibold tabular-nums',
                              left < 0 ? 'bg-red-100 text-red-800' : left === 0 ? 'bg-amber-100 text-amber-900' : used > 0 ? 'bg-sky-50 text-sky-800' : 'text-muted-foreground'
                            )}
                          >
                            {left}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        <span className="mr-3 inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-200" /> kurang unit (angka minus)</span>
        <span className="mr-3 inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-200" /> habis</span>
        <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-sky-100" /> sebagian terpakai</span>
      </p>
    </div>
  )
}

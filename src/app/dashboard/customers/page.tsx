import Link from 'next/link'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/orders/utils'
import { normalizePhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

const LIMIT = 100
// Buang karakter yang punya arti khusus di filter PostgREST
const clean = (s: string) => s.replace(/[,()%*\\]/g, ' ').trim().slice(0, 60)

type Cust = { id: string; name: string; phone_number: string; type: 'regular' | 'corporate' }

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const term = clean(q)
  const supabase = await createClient()

  let query = supabase.from('customers').select('id, name, phone_number, type').order('name').limit(LIMIT)
  if (term) {
    const ors = [`name.ilike.%${term}%`]
    const digits = term.replace(/\D/g, '')
    if (digits.length >= 3) ors.push(`phone_number.ilike.%${normalizePhone(term) ?? digits}%`)
    query = query.or(ors.join(','))
  }
  const { data, error } = await query
  if (error) return <p className="text-sm text-destructive">Gagal memuat pelanggan: {error.message}</p>
  const customers = (data ?? []) as Cust[]

  // Ringkasan pesanan per pelanggan
  const stats = new Map<string, { count: number; total: number }>()
  if (customers.length > 0) {
    const { data: ords } = await supabase
      .from('orders')
      .select('customer_id, total_amount, status')
      .in('customer_id', customers.map((c) => c.id))
      .neq('status', 'cancelled')
      .limit(5000)
    for (const o of ords ?? []) {
      const s = stats.get(o.customer_id) ?? { count: 0, total: 0 }
      s.count += 1
      s.total += Number(o.total_amount ?? 0)
      stats.set(o.customer_id, s)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pelanggan</h1>
        <p className="text-sm text-muted-foreground">
          Dibuat otomatis saat pesanan dibuat. Pesanan batal tidak dihitung.
        </p>
      </div>

      <form className="flex gap-2" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            name="q"
            defaultValue={term}
            placeholder="Cari nama atau nomor WA"
            aria-label="Cari pelanggan"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit">Cari</Button>
      </form>

      {customers.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-background py-10 text-center text-sm text-muted-foreground">
          {term ? 'Tidak ada pelanggan yang cocok.' : 'Belum ada pelanggan.'}
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {customers.map((c) => {
            const s = stats.get(c.id)
            return (
              <li key={c.id}>
                <Link href={`/dashboard/customers/${c.id}`} className="card-lift block rounded-xl border bg-background p-4 text-sm shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{c.name}</p>
                    {c.type === 'corporate' && <Badge variant="outline">Perusahaan</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.phone_number}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s ? `${s.count} pesanan · ${formatRupiah(s.total)}` : 'Belum ada pesanan'}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {customers.length === LIMIT && (
        <p className="text-xs text-muted-foreground">Menampilkan {LIMIT} pertama. Persempit dengan pencarian.</p>
      )}
    </div>
  )
}

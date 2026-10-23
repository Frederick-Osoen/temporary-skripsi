import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { OrderStatusBadge } from '@/components/dashboard/orders/status-badge'
import { formatDate, formatRupiah } from '@/lib/orders/utils'
import type { OrderStatus } from '@/lib/orders/status'

export const dynamic = 'force-dynamic'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()
  const supabase = await createClient()

  const [custRes, ordRes] = await Promise.all([
    supabase.from('customers').select('id, name, phone_number, type').eq('id', id).maybeSingle(),
    supabase
      .from('orders')
      .select('id, order_code, status, start_date, end_date, destination, total_amount')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])
  if (custRes.error) return <p className="text-sm text-destructive">Gagal memuat pelanggan: {custRes.error.message}</p>
  if (!custRes.data) notFound()
  if (ordRes.error) return <p className="text-sm text-destructive">Gagal memuat pesanan: {ordRes.error.message}</p>

  const c = custRes.data
  const orders = ordRes.data ?? []
  const valid = orders.filter((o) => o.status !== 'cancelled')
  const total = valid.reduce((s, o) => s + Number(o.total_amount ?? 0), 0)

  return (
    <div className="space-y-4">
      <Link href="/dashboard/customers" className="text-sm text-muted-foreground hover:underline">← Kembali ke pelanggan</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{c.name}</h1>
          <p className="text-sm text-muted-foreground">
            {c.phone_number} {c.type === 'corporate' && <Badge variant="outline" className="ml-1">Perusahaan</Badge>}
          </p>
        </div>
        <a href={`https://wa.me/${c.phone_number}`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <MessageCircle className="mr-2 h-4 w-4" /> Chat WhatsApp
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Jumlah pesanan</p>
          <p className="text-2xl font-semibold tabular-nums">{valid.length}</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Total nilai</p>
          <p className="text-2xl font-semibold tabular-nums">{formatRupiah(total)}</p>
        </div>
      </div>

      <section className="rounded-xl border bg-background">
        <h2 className="border-b px-4 py-3 text-sm font-semibold">Riwayat pesanan</h2>
        {orders.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada pesanan.</p>
        ) : (
          <ul className="divide-y">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{o.order_code}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(o.start_date)}
                      {o.end_date !== o.start_date ? ` – ${formatDate(o.end_date)}` : ''} · {o.destination}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">{formatRupiah(Number(o.total_amount ?? 0))}</span>
                    <OrderStatusBadge status={o.status as OrderStatus} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

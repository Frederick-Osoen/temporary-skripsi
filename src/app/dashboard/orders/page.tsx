import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatRupiah } from '@/lib/orders/utils'
import { STATUS_LABEL, type OrderStatus } from '@/lib/orders/status'

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

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_code, start_date, end_date, destination, fleet_type, total_amount, status, customers(name, phone_number)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return <p className="text-sm text-destructive">Gagal memuat pesanan: {error.message}</p>
  const orders = (data ?? []) as unknown as Row[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pesanan</h1>
          <p className="text-sm text-muted-foreground">100 pesanan terbaru.</p>
        </div>
        <Link href="/dashboard/orders/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" /> Pesanan Baru
        </Link>
      </div>

      {created && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Pesanan <strong>{created}</strong> berhasil disimpan.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Tujuan</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length ? (
              orders.map((o) => {
                const c = Array.isArray(o.customers) ? o.customers[0] : o.customers
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                        <Link href={`/dashboard/orders/${o.id}`} className="hover:underline">{o.order_code}</Link>

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
                    <TableCell>
                        <Badge variant="secondary">{STATUS_LABEL[o.status as OrderStatus] ?? o.status}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Belum ada pesanan.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
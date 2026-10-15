'use client'

import Link from 'next/link'
import { MessageCircle, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatRupiah, rentalDays } from '@/lib/orders/utils'
import { STATUS_LABEL, isTerminal, statusFlow } from '@/lib/orders/status'
import { PICKUP_DESTINATION } from '@/lib/validations/order'
import type { OrderDetailData } from '@/lib/orders/detail'
import { OrderStatusActions } from './order-status-actions'
import { Section } from './ui'

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(iso))

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}

export function OrderDetail({ order, updated }: { order: OrderDetailData; updated: boolean }) {
  const days = order.hasRental ? rentalDays(order.start_date, order.end_date) : 1
  const locked = isTerminal(order.status)
  const pickup = order.destination === PICKUP_DESTINATION
  const flow = statusFlow(order.hasRental)
  const currentIdx = flow.indexOf(order.status)
  const itemsTotal = order.items.reduce((s, i) => s + i.subtotal, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{order.order_code}</h1>
          <p className="text-sm text-muted-foreground">Dibuat {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={order.status === 'cancelled' ? 'destructive' : order.status === 'completed' ? 'default' : 'secondary'}>
            {STATUS_LABEL[order.status]}
          </Badge>
          {!locked && (
            <Link href={`/dashboard/orders/${order.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Link>
          )}
        </div>
      </div>

      {updated && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Pesanan berhasil diperbarui.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Pelanggan">
            <Row label="Nama">{order.customer.name}</Row>
            <Row label="Tipe"><span className="capitalize">{order.customer.type}</span></Row>
            <Row label="WhatsApp">
              <a
                href={`https://wa.me/${order.customer.phone_number}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-green-700 hover:underline"
              >
                <MessageCircle className="h-4 w-4" /> {order.customer.phone_number}
              </a>
            </Row>
          </Section>

          <Section title="Jadwal">
            {order.hasRental ? (
              <>
                <Row label="Pemasangan (H-1)">{formatDate(order.setup_date)}</Row>
                <Row label="Acara">
                  {formatDate(order.start_date)}
                  {order.end_date !== order.start_date && <> – {formatDate(order.end_date)}</>}
                </Row>
                <Row label="Durasi sewa">{days} hari</Row>
              </>
            ) : (
              <Row label="Tanggal">{formatDate(order.start_date)}</Row>
            )}
          </Section>

          <Section title="Item Pesanan">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Perhitungan</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div className="font-medium">{i.name}</div>
                        <Badge variant={i.category === 'rental' ? 'default' : 'secondary'} className="mt-1 capitalize">{i.category}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {i.qty} × {formatRupiah(i.unit_price)}
                        {i.category === 'rental' && <> × {days} hari</>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">{formatRupiah(i.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>

          <Section title="Pengiriman">
            <Row label="Tujuan">{order.destination}</Row>
            {!pickup && (
              <>
                <Row label="Armada"><span className="capitalize">{order.fleet_type}</span></Row>
                <Row label="Jarak">{order.distance_km} km</Row>
                <Row label="BBM (pulang-pergi)">{formatRupiah(order.fuel_fee)}</Row>
                <Row label="Tol (pulang-pergi)">{formatRupiah(order.toll_fee)}</Row>
              </>
            )}
            <Row label="Ongkir">{formatRupiah(order.shipping_fee)}</Row>
          </Section>
        </div>

        <aside className="space-y-6 lg:col-span-1">
          <Section title="Status">
            {order.status === 'cancelled' ? (
              <p className="text-sm text-destructive">Pesanan dibatalkan.</p>
            ) : (
              <ol className="space-y-2">
                {flow.map((s, idx) => {
                  const done = idx < currentIdx
                  const current = idx === currentIdx
                  return (
                    <li key={s} className="flex items-center gap-3 text-sm">
                      <span
                        className={`h-3 w-3 shrink-0 rounded-full border ${
                          done ? 'border-primary bg-primary' : current ? 'border-primary bg-primary/20 ring-2 ring-primary' : 'border-muted-foreground/40'
                        }`}
                      />
                      <span className={current ? 'font-semibold' : done ? '' : 'text-muted-foreground'}>{STATUS_LABEL[s]}</span>
                    </li>
                  )
                })}
              </ol>
            )}
            <OrderStatusActions orderId={order.id} version={order.version} status={order.status} hasRental={order.hasRental} />
          </Section>

          <Section title="Ringkasan">
            <Row label="Subtotal item">{formatRupiah(itemsTotal)}</Row>
            <Row label="Ongkir">{formatRupiah(order.shipping_fee)}</Row>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatRupiah(order.total_amount)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Versi data: {order.version}</p>
          </Section>
        </aside>
      </div>
    </div>
  )
}
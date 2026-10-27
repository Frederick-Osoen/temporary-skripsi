'use client'

import { EVENT_LABEL } from '@/lib/validations/content'
import { useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, Check, LockOpen, MapPin, MessageCircle, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatRupiah, rentalDays } from '@/lib/orders/utils'
import { summarizePayments, type PaymentRow } from '@/lib/orders/payments'
import { STATUS_LABEL, isTerminal, statusFlow } from '@/lib/orders/status'
import { PICKUP_DESTINATION } from '@/lib/validations/order'
import type { AdminRole } from '@/lib/auth'
import type { HistoryRow, OrderDetailData } from '@/lib/orders/detail'
import type { AllocationData } from '@/lib/orders/allocation'
import type { ScheduleRow } from '@/lib/orders/schedule'
import { buildConfirmationMessage } from '@/lib/orders/confirmation'
import { AllocationSection } from './allocation-section'
import { ExtendDialog } from './extend-dialog'
import { OrderHistory } from './order-history'
import { OrderStatusActions } from './order-status-actions'
import { PaymentDeleteDialog } from './payment-delete-dialog'
import { PaymentDialog } from './payment-dialog'
import { PaymentEditDialog } from './payment-edit-dialog'
import { PaymentsSection } from './payments-section'
import { ScheduleSection } from './schedule-section'
import { OrderStatusBadge } from './status-badge'
import { Section } from './ui'

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(iso))

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right">{children}</span>
    </div>
  )
}

export function OrderDetail({
  order, payments, history, role, updated, duplicate, allocation, schedules, created, focusAllocation, scheduleApplied, eventType,
}: {
  order: OrderDetailData
  payments: PaymentRow[]
  history: HistoryRow[]
  role: AdminRole
  updated: boolean
  duplicate: boolean
  created: string | null
  focusAllocation: boolean
  scheduleApplied: boolean
  eventType: string | null
  allocation: AllocationData | null
  schedules: ScheduleRow[]
}) {
  const [payOpen, setPayOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  // simpan id, bukan objek, supaya selalu membaca data terbaru
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const editing = payments.find((p) => p.id === editingId) ?? null
  const deleting = payments.find((p) => p.id === deletingId) ?? null
  const editedIds = new Set(
    history.filter((h) => h.action === 'payment_edit').map((h) => h.details?.payment_id).filter((id): id is string => !!id)
  )

  const days = order.hasRental ? rentalDays(order.start_date, order.end_date) : 1
  const locked = isTerminal(order.status)
  const pickup = order.destination === PICKUP_DESTINATION
  const flow = statusFlow(order.hasRental)
  const currentIdx = flow.indexOf(order.status)
  const itemsTotal = order.items.reduce((s, i) => s + i.subtotal, 0)
  const pay = summarizePayments(order.total_amount, payments)
  const confirmUrl = buildConfirmationMessage(order, payments).url
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.destination)}`

  const rentalItems = order.items.filter((i) => i.category === 'rental')
  const rentalPerDay = rentalItems.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const overtimeItems = rentalItems
    .filter((i) => i.overtime_rate !== null)
    .map((i) => ({ name: i.name, qty: i.qty, rate: i.overtime_rate as number }))
  const missingRate = rentalItems.filter((i) => i.overtime_rate === null && /^genset\b/i.test(i.name)).map((i) => i.name)
  const shortfalls = (allocation?.items ?? [])
    .map((i) => ({ name: i.product_name, missing: i.qty - i.unit_ids.length - i.outsourced.reduce((s, v) => s + v.count, 0) }))
    .filter((s) => s.missing > 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{order.order_code}</h1>
          <p className="text-sm text-muted-foreground">
            Dibuat {formatDateTime(order.created_at)}
            {eventType && (EVENT_LABEL as Record<string, string>)[eventType] ? ` · ${(EVENT_LABEL as Record<string, string>)[eventType]}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          {order.status !== 'cancelled' && (
            <a href={confirmUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <MessageCircle className="mr-2 h-4 w-4" /> Kirim Konfirmasi WA
            </a>
          )}
          {!locked && order.hasRental && order.status !== 'waiting_payment' && (
            <Button type="button" variant="outline" size="sm" onClick={() => setExtendOpen(true)}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Perpanjang Sewa
            </Button>
          )}
          {!locked && (
            <Link href={`/dashboard/orders/${order.id}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Link>
          )}
          {locked && role === 'owner' && (
            <Link href={`/dashboard/orders/${order.id}/edit?override=1`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <LockOpen className="mr-2 h-4 w-4" /> Buka Kunci &amp; Edit
            </Link>
          )}
        </div>
      </div>

      {created && (
        <div role="status" className="space-y-1 rounded-md bg-green-50 px-3 py-2 text-sm text-green-900">
          <p>Pesanan <strong>{created}</strong> berhasil disimpan.</p>
          {scheduleApplied && <p>Jam pemakaian genset dari pelanggan sudah masuk otomatis ke Jadwal Operasional. Cek di bagian bawah.</p>}
          {focusAllocation && (
            <p>
              Langkah berikutnya: <a href="#alokasi" className="font-semibold underline underline-offset-2">atur alokasi unit</a> agar jadwal pemasangan aman.
            </p>
          )}
        </div>
      )}
      {updated && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Pesanan berhasil diperbarui.</p>
      )}
      {duplicate && (
        <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Pesanan ini sudah tersimpan sebelumnya (koneksi sempat terputus saat menyimpan). Periksa datanya dan edit bila ada yang perlu diubah.
        </p>
      )}

      {/* Status & aksi utama: lebar penuh, langkah berikutnya selalu terlihat */}
      <section aria-labelledby="status-heading" className="rounded-xl border bg-background">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
          <h2 id="status-heading" className="text-sm font-semibold">Status pesanan</h2>
          {order.status !== 'cancelled' && currentIdx >= 0 && (
            <p className="text-xs text-muted-foreground">Langkah {currentIdx + 1} dari {flow.length}</p>
          )}
        </div>

        {order.status === 'cancelled' ? (
          <p className="px-4 py-4 text-sm font-medium text-destructive">Pesanan dibatalkan dan terkunci.</p>
        ) : (
          <ol className="flex px-4 pt-5 pb-1" aria-label="Tahapan pesanan">
            {flow.map((s, idx) => {
              const done = idx < currentIdx || order.status === 'completed'
              const current = idx === currentIdx && order.status !== 'completed'
              return (
                <li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
                  {idx > 0 && (
                    <span
                      className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${idx <= currentIdx || order.status === 'completed' ? 'bg-primary' : 'bg-border'}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors ${
                      done ? 'bg-primary text-primary-foreground'
                        : current ? 'bg-background text-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                        : 'border bg-background text-muted-foreground'
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : idx + 1}
                  </span>
                  <span className={`mt-2 hidden px-1 text-xs leading-tight sm:block ${current ? 'font-semibold text-foreground' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {STATUS_LABEL[s]}
                  </span>
                  <span className="sr-only">{done ? ' (selesai)' : current ? ' (sekarang)' : ''}</span>
                </li>
              )
            })}
          </ol>
        )}
        {order.status !== 'cancelled' && currentIdx >= 0 && (
          <p className="px-4 pt-2 text-center text-sm font-semibold sm:hidden">{STATUS_LABEL[order.status]}</p>
        )}

        <div className="p-4">
          <OrderStatusActions
            orderId={order.id}
            version={order.version}
            status={order.status}
            hasRental={order.hasRental}
            remaining={pay.remaining}
            shortfalls={shortfalls}
            onRecordPayment={() => setPayOpen(true)}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* 2. Pelanggan & pengiriman */}
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="Pelanggan">
              <Row label="Nama">{order.customer.name}</Row>
              <Row label="Tipe"><span className="capitalize">{order.customer.type}</span></Row>
              <Row label="WhatsApp">
                <a href={`https://wa.me/${order.customer.phone_number}`} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-green-700 hover:underline">
                  <MessageCircle className="h-4 w-4" /> {order.customer.phone_number}
                </a>
              </Row>
            </Section>

            <Section title="Pengiriman & Tanggal">
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
              <Row label="Tujuan">
                {pickup ? (
                  order.destination
                ) : (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 text-primary hover:underline">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{order.destination}</span>
                  </a>
                )}
              </Row>
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

          {/* 3. Item & alokasi */}
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
          {allocation && (
            <div id="alokasi" className={focusAllocation ? 'scroll-mt-20 rounded-xl ring-2 ring-primary ring-offset-2' : 'scroll-mt-20'}>
              <AllocationSection data={allocation} />
            </div>
          )}

          {/* 4. Jadwal operasional */}
          {order.hasRental && (
            <ScheduleSection
              key={order.version}
              orderId={order.id}
              version={order.version}
              locked={locked}
              startDate={order.start_date}
              endDate={order.end_date}
              schedules={schedules}
              overtimeItems={overtimeItems}
              missingRate={missingRate}
            />
          )}

          {/* 5. Pembayaran */}
          <PaymentsSection
            total={order.total_amount}
            payments={payments}
            status={order.status}
            role={role}
            editedIds={editedIds}
            onRecord={() => setPayOpen(true)}
            onEdit={setEditingId}
            onDelete={setDeletingId}
          />
        </div>

        <aside className="space-y-6 lg:col-span-1">
          <Section title="Ringkasan">
            <Row label="Subtotal item">{formatRupiah(itemsTotal)}</Row>
            <Row label="Ongkir">{formatRupiah(order.shipping_fee)}</Row>
            {order.overtime_fee > 0 && <Row label="Overtime genset">{formatRupiah(order.overtime_fee)}</Row>}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatRupiah(order.total_amount)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Versi data: {order.version}</p>
          </Section>
          <OrderHistory history={history} />
        </aside>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        orderId={order.id}
        version={order.version}
        status={order.status}
        total={order.total_amount}
        paid={pay.paid}
      />
      <PaymentEditDialog
        payment={editing}
        onClose={() => setEditingId(null)}
        version={order.version}
        status={order.status}
        total={order.total_amount}
        paid={pay.paid}
      />
      <PaymentDeleteDialog
        payment={deleting}
        onClose={() => setDeletingId(null)}
        version={order.version}
        status={order.status}
        isLast={payments.length === 1}
      />
      <ExtendDialog
        open={extendOpen}
        onOpenChange={setExtendOpen}
        orderId={order.id}
        version={order.version}
        startDate={order.start_date}
        endDate={order.end_date}
        rentalPerDay={rentalPerDay}
      />
    </div>
  )
}
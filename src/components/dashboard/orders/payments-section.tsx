'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatRupiah } from '@/lib/orders/utils'
import {
  PAYMENT_METHOD_LABEL, PAYMENT_TYPE_LABEL, summarizePayments, type PaymentRow,
} from '@/lib/orders/payments'
import { isTerminal, type OrderStatus } from '@/lib/orders/status'
import type { AdminRole } from '@/lib/auth'
import { Section } from './ui'

const formatDay = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date(iso))

export function PaymentsSection({
  total, payments, status, role, editedIds, onRecord, onEdit, onDelete,
}: {
  total: number
  payments: PaymentRow[]
  status: OrderStatus
  role: AdminRole
  editedIds: Set<string>
  onRecord: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}) {
  const s = summarizePayments(total, payments)
  const locked = isTerminal(status)
  // Pesanan aktif: admin & owner. Pesanan final: hanya owner.
  const canManage = !locked || role === 'owner'

  const deleteBlocked: string | null =
    status === 'completed'
      ? 'Pesanan Selesai harus tetap lunas. Ubah nominal bila perlu.'
      : payments.length === 1 && (status === 'event_running' || status === 'waiting_payment')
        ? 'Acara sudah berjalan. Pembayaran terakhir tidak bisa dihapus, ubah nominalnya.'
        : null

  return (
    <Section title="Pembayaran">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Total tagihan</p><p className="font-medium">{formatRupiah(total)}</p></div>
        <div><p className="text-xs text-muted-foreground">{status === 'cancelled' ? 'DP hangus' : 'Sudah dibayar'}</p><p className="font-medium">{formatRupiah(s.paid)}</p></div>
        <div><p className="text-xs text-muted-foreground">Sisa</p><p className="font-medium">{status === 'cancelled' ? '-' : formatRupiah(s.remaining)}</p></div>
      </div>

      {status !== 'cancelled' && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.percent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{s.paidOff ? 'Lunas' : `${s.percent}% terbayar`}</p>
        </div>
      )}

      {status === 'cancelled' && s.paid > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Pesanan dibatalkan. Pembayaran tercatat dianggap hangus. Refund (jika ada) diurus manual di luar sistem.
        </p>
      )}

      {payments.length === 0 ? (
        <p className="rounded-md border border-dashed py-4 text-center text-sm text-muted-foreground">Belum ada pembayaran.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Dicatat oleh</TableHead>
                {canManage && <TableHead><span className="sr-only">Aksi</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap align-top">{formatDay(p.payment_date)}</TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{PAYMENT_TYPE_LABEL[p.payment_type]}</Badge>
                        {editedIds.has(p.id) && <span className="text-xs text-amber-700">diedit</span>}
                      </div>
                      {p.notes && (
                        <p className="max-w-48 truncate text-xs text-muted-foreground" title={p.notes}>{p.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">{PAYMENT_METHOD_LABEL[p.payment_method]}</TableCell>
                  <TableCell className="whitespace-nowrap text-right align-top">{formatRupiah(p.amount)}</TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">{p.recorded_by ?? '-'}</TableCell>
                  {canManage && (
                    <TableCell className="align-top">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label="Edit pembayaran" onClick={() => onEdit(p.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button" variant="ghost" size="icon" aria-label="Hapus pembayaran"
                          disabled={!!deleteBlocked} title={deleteBlocked ?? 'Hapus pembayaran'}
                          onClick={() => onDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {locked && role !== 'owner' && payments.length > 0 && (
        <p className="text-xs text-muted-foreground">Pesanan sudah final. Hanya owner yang dapat mengubah pembayaran.</p>
      )}

      {!locked && s.remaining > 0 && (
        <Button type="button" variant="outline" onClick={onRecord}>
          <Plus className="mr-2 h-4 w-4" /> Catat Pembayaran
        </Button>
      )}
    </Section>
  )
}
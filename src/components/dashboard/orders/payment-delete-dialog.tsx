'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { deletePayment } from '@/app/dashboard/orders/actions'
import { safeAction } from '@/lib/action-client'
import { formatRupiah } from '@/lib/orders/utils'
import { PAYMENT_METHOD_LABEL, PAYMENT_TYPE_LABEL, type PaymentRow } from '@/lib/orders/payments'
import { isTerminal, type OrderStatus } from '@/lib/orders/status'

const textareaClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Props = { payment: PaymentRow | null; onClose: () => void; version: number; status: OrderStatus; isLast: boolean }

export function PaymentDeleteDialog({ payment, onClose, version, status, isLast }: Props) {
  return (
    <AlertDialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        {payment && <DeleteBody key={`${payment.id}:${version}`} payment={payment} version={version} status={status} isLast={isLast} onDone={onClose} />}
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteBody({
  payment, version, status, isLast, onDone,
}: { payment: PaymentRow; version: number; status: OrderStatus; isLast: boolean; onDone: () => void }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirm() {
    setError(null)
    setConflict(false)
    if (reason.trim().length < 5) return setError('Alasan wajib diisi (minimal 5 karakter).')

    startTransition(async () => {
      const res = await safeAction(() => deletePayment({ payment_id: payment.id, version, reason }))
      if (res.ok) return onDone()
      setError(res.error)
      setConflict(res.code === 'CONFLICT' || res.code === 'UNAVAILABLE')
    })
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Hapus pembayaran?</AlertDialogTitle>
        <AlertDialogDescription>
          {PAYMENT_TYPE_LABEL[payment.payment_type]} {formatRupiah(payment.amount)} ({PAYMENT_METHOD_LABEL[payment.payment_method]}) akan
          dihapus dari pesanan ini. Datanya tetap tersimpan di riwayat sebagai bukti penghapusan.
        </AlertDialogDescription>
      </AlertDialogHeader>

      {isTerminal(status) && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Pesanan sudah final. Tindakan ini hanya bisa dilakukan owner.
        </p>
      )}

      {isLast && (status === 'dp_received' || status === 'in_setup') && (
        <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Ini pembayaran terakhir. Setelah dihapus, status pesanan kembali ke <strong>Menunggu DP</strong>. Alokasi unit tidak berubah.
        </p>
      )}

      <div className="space-y-1">
        <label htmlFor="delete_reason" className="text-sm font-medium">Alasan penghapusan *</label>
        <textarea id="delete_reason" rows={2} maxLength={500} className={textareaClass} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      {error && (
        <div role="alert" className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          {conflict && (
            <Button type="button" size="sm" variant="outline" onClick={() => { onDone(); router.refresh() }}>
              Muat data terbaru
            </Button>
          )}
        </div>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
        <Button variant="destructive" onClick={confirm} disabled={pending}>{pending ? 'Menghapus...' : 'Ya, hapus'}</Button>
      </AlertDialogFooter>
    </>
  )
}
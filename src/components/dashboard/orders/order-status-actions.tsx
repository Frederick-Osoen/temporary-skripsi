'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { changeOrderStatus } from '@/app/dashboard/orders/actions'
import { safeAction } from '@/lib/action-client'
import { formatRupiah } from '@/lib/orders/utils'
import {
  REFUND_WARNING, STATUS_LABEL, canCancel, cancelNeedsRefundWarning, getNextStatus, isTerminal,
  type OrderStatus,
} from '@/lib/orders/status'

const CONFIRM_TEXT: Partial<Record<OrderStatus, string>> = {
  in_setup: 'Tim mulai melakukan pemasangan unit.',
  event_running: 'Acara dimulai. Setelah ini pesanan tidak bisa dibatalkan.',
  waiting_payment: 'Acara selesai dan unit sudah dibongkar, tetapi tagihan belum lunas. Pesanan akan menunggu pelunasan dan tidak bisa dibatalkan.',
  completed: 'Pesanan ditandai selesai dan akan TERKUNCI. Hitungan sewa unit yang dialokasikan bertambah otomatis.',
  cancelled: 'Pesanan dibatalkan dan akan TERKUNCI. Unit yang dialokasikan dilepas tanpa menambah hitungan sewa. Tindakan ini tidak bisa dibatalkan.',
}

const textareaClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function OrderStatusActions({
  orderId, version, status, hasRental, remaining, onRecordPayment, shortfalls
}: {
  orderId: string
  version: number
  status: OrderStatus
  hasRental: boolean
  remaining: number
  onRecordPayment: () => void
  shortfalls: { name: string; missing: number }[]
}) {
  const router = useRouter()
  const [target, setTarget] = useState<OrderStatus | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [pending, startTransition] = useTransition()
  const warnShortfall = target === 'in_setup' && shortfalls.length > 0

  if (isTerminal(status)) {
    return <p className="text-sm text-muted-foreground">Pesanan sudah final dan terkunci.</p>
  }

  const next = getNextStatus(status, hasRental, remaining <= 0)
  const blockedByBalance = next === 'completed' && remaining > 0

  function open(s: OrderStatus) {
    setError(null)
    setConflict(false)
    setNote('')
    setTarget(s)
  }

  function confirm() {
    if (!target) return
    const to = target
    if (to === 'cancelled' && note.trim().length < 3) {
      setError('Alasan pembatalan wajib diisi (minimal 3 karakter).')
      return
    }
    startTransition(async () => {
      const res = await safeAction(() => changeOrderStatus({ id: orderId, version, status: to, note: note.trim() }))
      if (res.ok) {
        setTarget(null) // data diperbarui lewat revalidatePath di server
        return
      }
      setError(res.error)
      setConflict(res.code === 'CONFLICT')
    })
  }

  return (
    <div className="space-y-2">
      {status === 'pending_dp' ? (
        <Button className="w-full" onClick={onRecordPayment}>Catat DP</Button>
      ) : next && !blockedByBalance ? (
        <Button className="w-full" onClick={() => open(next)}>Lanjut: {STATUS_LABEL[next]}</Button>
      ) : next ? (
        <div className="space-y-2">
          <Button className="w-full" disabled>Lanjut: {STATUS_LABEL[next]}</Button>
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Belum lunas. Sisa tagihan {formatRupiah(remaining)} harus dilunasi sebelum pesanan diselesaikan.
          </p>
          <Button variant="outline" className="w-full" onClick={onRecordPayment}>Catat Pelunasan</Button>
        </div>
      ) : null}

      {canCancel(status) && (
        <Button variant="outline" className="w-full text-destructive" onClick={() => open('cancelled')}>
          Batalkan Pesanan
        </Button>
      )}

      <AlertDialog open={!!target} onOpenChange={(o) => !o && !pending && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target === 'cancelled' ? 'Batalkan pesanan?' : `Ubah status ke "${target ? STATUS_LABEL[target] : ''}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>{target ? CONFIRM_TEXT[target] : ''}</AlertDialogDescription>
          </AlertDialogHeader>

          {target === 'cancelled' && cancelNeedsRefundWarning(status) && (
            <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {REFUND_WARNING}
            </p>
          )}

          {warnShortfall && (
            <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">Alokasi unit belum lengkap</p>
              <ul className="mt-1 list-disc pl-5">
                {shortfalls.map((s) => (
                  <li key={s.name}>{s.name}: kurang {s.missing} unit</li>
                ))}
              </ul>
              <p className="mt-1 text-xs">
                Pemasangan akan dimulai tanpa seluruh unit teralokasi. Anda dapat melengkapinya nanti lewat Atur Alokasi.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="status_note" className="text-sm font-medium">
              {target === 'cancelled' ? 'Alasan pembatalan *' : 'Catatan (opsional)'}
            </label>
            <textarea
              id="status_note"
              rows={2}
              maxLength={500}
              className={textareaClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <div role="alert" className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <p>{error}</p>
              {conflict && (
                <Button type="button" size="sm" variant="outline" onClick={() => { setTarget(null); router.refresh() }}>
                  Muat data terbaru
                </Button>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <Button variant={target === 'cancelled' ? 'destructive' : 'default'} onClick={confirm} disabled={pending}>
              {pending ? 'Memproses...' : warnShortfall ? 'Tetap Lanjut Tanpa Unit Lengkap' : 'Ya, lanjutkan'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
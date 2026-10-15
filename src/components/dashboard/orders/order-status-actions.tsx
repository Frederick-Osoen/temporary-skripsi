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
import { STATUS_LABEL, canCancel, getNextStatus, isTerminal, type OrderStatus } from '@/lib/orders/status'

const CONFIRM_TEXT: Partial<Record<OrderStatus, string>> = {
  dp_received: 'Pastikan DP sudah diterima dan dicek di mutasi rekening.',
  in_setup: 'Tim mulai melakukan pemasangan unit.',
  event_running: 'Acara dimulai. Setelah ini pesanan tidak bisa dibatalkan.',
  completed: 'Pesanan ditandai selesai dan akan TERKUNCI. Hitungan sewa unit yang dialokasikan bertambah otomatis.',
  cancelled: 'Pesanan dibatalkan dan akan TERKUNCI. Unit yang dialokasikan dilepas tanpa menambah hitungan sewa. Tindakan ini tidak bisa dibatalkan.',
}

export function OrderStatusActions({
  orderId, version, status, hasRental,
}: { orderId: string; version: number; status: OrderStatus; hasRental: boolean }) {
  const router = useRouter()
  const [target, setTarget] = useState<OrderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [pending, startTransition] = useTransition()

  if (isTerminal(status)) {
    return <p className="text-sm text-muted-foreground">Pesanan sudah final dan terkunci.</p>
  }

  const next = getNextStatus(status, hasRental)

  function open(s: OrderStatus) {
    setError(null)
    setConflict(false)
    setTarget(s)
  }

  function confirm() {
    if (!target) return
    const to = target
    startTransition(async () => {
      const res = await safeAction(() => changeOrderStatus({ id: orderId, version, status: to }))
      if (res.ok) {
        setTarget(null) // data diperbarui otomatis lewat revalidatePath di server
        return
      }
      setError(res.error)
      setConflict(res.code === 'CONFLICT')
    })
  }

  return (
    <div className="space-y-2">
      {next && (
        <Button className="w-full" onClick={() => open(next)}>
          Lanjut: {STATUS_LABEL[next]}
        </Button>
      )}
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
              {pending ? 'Memproses...' : 'Ya, lanjutkan'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
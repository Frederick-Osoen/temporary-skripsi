'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { extendOrder } from '@/app/dashboard/orders/actions'
import { safeAction } from '@/lib/action-client'
import { addDays, formatDate, formatRupiah, rentalDays } from '@/lib/orders/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  version: number
  startDate: string
  endDate: string
  rentalPerDay: number // jumlah qty x harga/hari semua item rental
}

export function ExtendDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Perpanjang Sewa</DialogTitle>
          <DialogDescription>
            Menambah hari sewa untuk semua item rental. Unit yang sudah dialokasikan dicek ulang terhadap pesanan lain.
          </DialogDescription>
        </DialogHeader>
        {open && <ExtendForm key={rest.version} {...rest} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ExtendForm({
  orderId, version, startDate, endDate, rentalPerDay, onDone,
}: Omit<Props, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const router = useRouter()
  const [daysText, setDaysText] = useState('1')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [pending, startTransition] = useTransition()

  const n = Number(daysText)
  const valid = Number.isInteger(n) && n >= 1 && n <= 30
  const newEnd = valid ? addDays(endDate, n) : null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setConflict(false)
    if (!valid) return setError('Jumlah hari harus bilangan bulat 1-30.')

    startTransition(async () => {
      const res = await safeAction(() => extendOrder({ order_id: orderId, version, add_days: n, reason }))
      if (res.ok) return onDone()
      setError(res.error)
      setConflict(res.code === 'CONFLICT' || res.code === 'UNAVAILABLE')
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sewa saat ini: {formatDate(startDate)} – {formatDate(endDate)} ({rentalDays(startDate, endDate)} hari)
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="add_days">Tambah berapa hari?</Label>
          <Input id="add_days" type="number" min={1} max={30} step={1} inputMode="numeric" value={daysText} onChange={(e) => setDaysText(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ext_reason">Catatan (opsional)</Label>
          <Input id="ext_reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: klien minta tambah hari" />
        </div>
      </div>

      {valid && newEnd && (
        <div className="space-y-1 rounded-md bg-muted/40 p-3 text-sm">
          <p>Selesai baru: <strong>{formatDate(newEnd)}</strong> ({rentalDays(startDate, newEnd)} hari)</p>
          <p>Tambahan tagihan sewa: <strong>{formatRupiah(rentalPerDay * n)}</strong></p>
          <p className="text-xs text-muted-foreground">Overtime genset untuk hari tambahan diisi di Jadwal Operasional.</p>
        </div>
      )}

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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>Batal</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Memproses...' : 'Perpanjang'}</Button>
      </div>
    </form>
  )
}
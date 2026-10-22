'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { recordPayment } from '@/app/dashboard/orders/actions'
import { safeAction } from '@/lib/action-client'
import { formatRupiah } from '@/lib/orders/utils'
import { RupiahInput } from '@/components/ui/rupiah-input'
import {
  PAYMENT_METHODS, PAYMENT_METHOD_LABEL, PAYMENT_TYPE_LABEL,
  type PaymentMethod, type PaymentType,
} from '@/lib/orders/payments'
import type { OrderStatus } from '@/lib/orders/status'
import { selectClass } from './ui'

const todayWIB = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  version: number
  status: OrderStatus
  total: number
  paid: number
}

export function PaymentDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Pembayaran</DialogTitle>
          <DialogDescription>Pembayaran yang sudah dicatat tidak dapat diubah atau dihapus.</DialogDescription>
        </DialogHeader>
        {/* dirender hanya saat terbuka: form selalu mulai bersih, key version memuat ulang setelah konflik */}
        {open && <PaymentForm key={rest.version} {...rest} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PaymentForm({
  orderId, version, status, total, paid, onDone,
}: Omit<Props, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const router = useRouter()
  const remaining = Math.max(0, total - paid)
  const firstPayment = status === 'pending_dp'
  const typeOptions: PaymentType[] = firstPayment ? ['dp', 'pelunasan'] : ['termin', 'pelunasan']

  const [type, setType] = useState<PaymentType>(typeOptions[0])
  const [amount, setAmount] = useState<number | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [date, setDate] = useState(todayWIB())
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [pending, startTransition] = useTransition()

  const isFull = type === 'pelunasan'
  const amountNum = isFull ? remaining : (amount ?? 0)
  const valid = amountNum > 0
  const after = valid ? remaining - amountNum : remaining

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setConflict(false)
    if (!valid) return setError('Isi nominal pembayaran.')
    if (amountNum > remaining) return setError('Nominal melebihi sisa tagihan.')

    startTransition(async () => {
      const res = await safeAction(() =>
        recordPayment({ order_id: orderId, version, type, amount: amountNum, method, paid_at: date, notes })
      )
      if (res.ok) return onDone()
      setError(res.error)
      setConflict(res.code === 'CONFLICT' || res.code === 'UNAVAILABLE')
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Total</p><p className="font-medium">{formatRupiah(total)}</p></div>
        <div><p className="text-xs text-muted-foreground">Dibayar</p><p className="font-medium">{formatRupiah(paid)}</p></div>
        <div><p className="text-xs text-muted-foreground">Sisa</p><p className="font-medium">{formatRupiah(remaining)}</p></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pay_type">Jenis</Label>
          <select id="pay_type" className={selectClass} value={type} onChange={(e) => setType(e.target.value as PaymentType)}>
            {typeOptions.map((t) => <option key={t} value={t}>{PAYMENT_TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pay_method">Metode</Label>
          <select id="pay_method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pay_amount">Nominal (Rp)</Label>
        <div className="flex gap-2">
          <RupiahInput
            id="pay_amount"
            value={isFull ? remaining : amount}
            onValueChange={setAmount}
            readOnly={isFull}
            placeholder="0"
          />
          {!isFull && (
            <Button type="button" variant="outline" onClick={() => setAmount(remaining)}>Sisa</Button>
          )}
        </div>
        {isFull && <p className="text-xs text-muted-foreground">Pelunasan = seluruh sisa tagihan.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pay_date">Tanggal bayar</Label>
          <Input id="pay_date" type="date" max={todayWIB()} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pay_notes">Catatan (opsional)</Label>
          <Input id="pay_notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contoh: transfer BCA a.n. ..." />
        </div>
      </div>

      {valid && <p className="text-sm">Sisa setelah pembayaran ini: <strong>{formatRupiah(after)}</strong></p>}
      {firstPayment && (
        <p className="text-xs text-muted-foreground">Status pesanan akan otomatis menjadi DP Diterima.</p>
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
        <Button type="submit" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan Pembayaran'}</Button>
      </div>
    </form>
  )
}
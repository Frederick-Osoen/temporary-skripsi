'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { editPayment } from '@/app/dashboard/orders/actions'
import { safeAction } from '@/lib/action-client'
import { formatRupiah } from '@/lib/orders/utils'
import {
  PAYMENT_METHODS, PAYMENT_METHOD_LABEL, PAYMENT_TYPES, PAYMENT_TYPE_LABEL,
  type PaymentMethod, type PaymentRow, type PaymentType,
} from '@/lib/orders/payments'
import { isTerminal, type OrderStatus } from '@/lib/orders/status'
import { selectClass } from './ui'

const todayWIB = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
const dayWIB = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

type Props = {
  payment: PaymentRow | null
  onClose: () => void
  version: number
  status: OrderStatus
  total: number
  paid: number
}

export function PaymentEditDialog({ payment, onClose, ...rest }: Props) {
  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Pembayaran</DialogTitle>
          <DialogDescription>Perubahan dicatat di riwayat beserta alasannya.</DialogDescription>
        </DialogHeader>
        {/* key: form dibuat ulang setiap pembayaran/versi berganti */}
        {payment && <EditForm key={`${payment.id}:${rest.version}`} payment={payment} {...rest} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function EditForm({
  payment, version, status, total, paid, onDone,
}: Omit<Props, 'payment' | 'onClose'> & { payment: PaymentRow; onDone: () => void }) {
  const router = useRouter()
  const [type, setType] = useState<PaymentType>(payment.payment_type)
  const [amount, setAmount] = useState<number | null>(payment.amount)
  const [method, setMethod] = useState<PaymentMethod>(payment.payment_method)
  const [date, setDate] = useState(dayWIB(payment.payment_date))
  const [notes, setNotes] = useState(payment.notes ?? '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [pending, startTransition] = useTransition()

  const maxAmount = total - (paid - payment.amount) // nominal tertinggi yang masih sah
  const final = isTerminal(status)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setConflict(false)
    if (!amount || amount <= 0) return setError('Isi nominal pembayaran.')
    if (amount > maxAmount) return setError(`Nominal melebihi batas (${formatRupiah(maxAmount)}).`)
    if (reason.trim().length < 5) return setError('Alasan wajib diisi (minimal 5 karakter).')

    startTransition(async () => {
      const res = await safeAction(() =>
        editPayment({ payment_id: payment.id, version, type, amount, method, paid_at: date, notes, reason })
      )
      if (res.ok) return onDone()
      setError(res.error)
      setConflict(res.code === 'CONFLICT' || res.code === 'UNAVAILABLE')
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {final && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Pesanan sudah final. Perubahan ini hanya bisa dilakukan owner dan tercatat di audit trail.
          {status === 'completed' && ' Total pembayaran harus tetap sama dengan total tagihan.'}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit_type">Jenis</Label>
          <select id="edit_type" className={selectClass} value={type} onChange={(e) => setType(e.target.value as PaymentType)}>
            {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{PAYMENT_TYPE_LABEL[t]}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_method">Metode</Label>
          <select id="edit_method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit_amount">Nominal (Rp)</Label>
        <RupiahInput id="edit_amount" value={amount} onValueChange={setAmount} placeholder="0" />
        <p className="text-xs text-muted-foreground">Batas tertinggi: {formatRupiah(maxAmount)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edit_date">Tanggal bayar</Label>
          <Input id="edit_date" type="date" max={todayWIB()} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_notes">Catatan</Label>
          <Input id="edit_notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit_reason">Alasan perubahan *</Label>
        <Input id="edit_reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: salah ketik nominal" />
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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>Batal</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
      </div>
    </form>
  )
}
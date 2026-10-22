export const PAYMENT_TYPES = ['dp', 'termin', 'pelunasan'] as const
export type PaymentType = (typeof PAYMENT_TYPES)[number]
export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = { dp: 'DP', termin: 'Termin', pelunasan: 'Pelunasan' }

export const PAYMENT_METHODS = ['transfer', 'tunai', 'qris', 'lainnya'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: 'Transfer',
  tunai: 'Tunai',
  qris: 'QRIS',
  lainnya: 'Lainnya',
}

export type PaymentRow = {
  id: string
  payment_type: PaymentType
  payment_method: PaymentMethod
  amount: number
  payment_date: string // ISO timestamp
  notes: string | null
  recorded_by: string | null
}

export function summarizePayments(total: number, payments: { amount: number }[]) {
  const paid = payments.reduce((s, p) => s + p.amount, 0)
  return {
    paid,
    remaining: Math.max(0, total - paid),
    percent: total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100,
    paidOff: paid >= total,
  }
}
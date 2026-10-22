import { z } from 'zod'
import { PAYMENT_METHODS, PAYMENT_TYPES } from '@/lib/orders/payments'

const version = z.number().int().min(1)

const fields = {
  type: z.enum(PAYMENT_TYPES, { error: 'Jenis pembayaran tidak valid' }),
  amount: z
    .number({ error: 'Nominal harus angka' })
    .int('Nominal harus bilangan bulat')
    .min(1, 'Nominal minimal Rp1')
    .max(999_999_999, 'Nominal terlalu besar'),
  method: z.enum(PAYMENT_METHODS, { error: 'Metode pembayaran tidak valid' }),
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal pembayaran wajib diisi'),
  notes: z.string().trim().max(500, 'Catatan maksimal 500 karakter'),
}

const reason = z.string().trim().min(5, 'Alasan minimal 5 karakter').max(500, 'Alasan maksimal 500 karakter')

export const paymentSchema = z.object({ order_id: z.string().uuid(), version, ...fields })
export const paymentEditSchema = z.object({ payment_id: z.string().uuid(), version, ...fields, reason })
export const paymentDeleteSchema = z.object({ payment_id: z.string().uuid(), version, reason })
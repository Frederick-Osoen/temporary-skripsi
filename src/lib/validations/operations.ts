import { z } from 'zod'

const uuid = z.string().uuid()
const version = z.number().int().min(1)
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format jam tidak valid')

export const scheduleSchema = z
  .object({
    order_id: uuid,
    version,
    days: z
      .array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid'), start: hhmm, end: hhmm }))
      .max(90),
  })
  .superRefine((v, ctx) => {
    const dates = v.days.map((d) => d.date)
    if (new Set(dates).size !== dates.length) {
      ctx.addIssue({ code: 'custom', path: ['days'], message: 'Ada tanggal yang diisi lebih dari sekali' })
    }
    if (v.days.some((d) => d.start === d.end)) {
      ctx.addIssue({ code: 'custom', path: ['days'], message: 'Jam mulai dan selesai tidak boleh sama' })
    }
  })

export const extendSchema = z.object({
  order_id: uuid,
  version,
  add_days: z.number({ error: 'Jumlah hari harus angka' }).int('Harus bilangan bulat').min(1, 'Minimal 1 hari').max(30, 'Maksimal 30 hari'),
  reason: z.string().trim().max(500, 'Maksimal 500 karakter'),
})
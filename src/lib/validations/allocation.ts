import { z } from 'zod'

const uuid = z.string().uuid()

export const allocationSchema = z
  .object({
    order_id: uuid,
    version: z.number().int().min(1),
    items: z
      .array(
        z.object({
          order_item_id: uuid,
          unit_ids: z.array(uuid).max(1000),
          outsourced: z
            .array(
              z.object({
                vendor_name: z.string().trim().min(2, 'Nama vendor minimal 2 karakter').max(150, 'Nama vendor maksimal 150 karakter'),
                count: z.number().int('Jumlah harus bilangan bulat').min(1, 'Jumlah minimal 1').max(1000, 'Jumlah terlalu besar'),
              })
            )
            .max(20),
        })
      )
      .max(50),
  })
  .superRefine((v, ctx) => {
    const all = v.items.flatMap((i) => i.unit_ids)
    if (new Set(all).size !== all.length) {
      ctx.addIssue({ code: 'custom', path: ['items'], message: 'Ada unit yang dipilih lebih dari sekali' })
    }
  })
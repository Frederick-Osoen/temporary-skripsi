import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(150, 'Nama maksimal 150 karakter'),
  category: z.enum(['rental', 'sales'], { error: 'Kategori tidak valid' }),
  base_price: z.coerce.number({ error: 'Harga harus angka' }).min(0, 'Harga tidak boleh negatif').max(999_999_999, 'Harga terlalu besar'),
  total_stock: z.coerce.number({ error: 'Stok harus angka' }).int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif').max(100_000, 'Stok terlalu besar'),
  overtime_rate: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number({ error: 'Tarif harus angka' }).int('Harus bilangan bulat').min(0, 'Tidak boleh negatif').max(99_999_999, 'Terlalu besar').nullable()
  ),
})

export type Product = {
  id: string
  name: string
  category: 'rental' | 'sales'
  base_price: number
  total_stock: number
  overtime_rate: number | null
}
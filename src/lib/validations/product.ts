import { z } from 'zod'

// Path file di Storage hanya boleh berbentuk products/<uuid>.webp (dibuat oleh ImageUploader)
const IMAGE_PATH = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(150, 'Nama maksimal 150 karakter'),
  category: z.enum(['rental', 'sales'], { error: 'Kategori tidak valid' }),
  base_price: z.coerce.number({ error: 'Harga harus angka' }).min(0, 'Harga tidak boleh negatif').max(999_999_999, 'Harga terlalu besar'),
  total_stock: z.coerce.number({ error: 'Stok harus angka' }).int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif').max(100_000, 'Stok terlalu besar'),
  overtime_rate: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number({ error: 'Tarif harus angka' }).int('Harus bilangan bulat').min(0, 'Tidak boleh negatif').max(99_999_999, 'Terlalu besar').nullable()
  ),
  image_path: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().regex(IMAGE_PATH, 'Path foto tidak valid').nullable()
  ),
})

export type Product = {
  id: string
  name: string
  category: 'rental' | 'sales'
  base_price: number
  total_stock: number
  overtime_rate: number | null
  image_path: string | null
}

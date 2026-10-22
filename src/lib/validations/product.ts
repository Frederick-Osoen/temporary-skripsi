import { z } from 'zod'

// Path file di Storage hanya boleh berbentuk products/<uuid>.webp (dibuat oleh ImageUploader)
const IMAGE_PATH = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/

const emptyToNull = (v: unknown) => (v === '' || v === null || v === undefined ? null : v)

export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(150, 'Nama maksimal 150 karakter'),
    category: z.enum(['rental', 'sales'], { error: 'Kategori tidak valid' }),
    base_price: z.coerce.number({ error: 'Harga harus angka' }).min(0, 'Harga tidak boleh negatif').max(999_999_999, 'Harga terlalu besar'),
    total_stock: z.coerce.number({ error: 'Stok harus angka' }).int('Stok harus bilangan bulat').min(0, 'Stok tidak boleh negatif').max(100_000, 'Stok terlalu besar'),
    overtime_rate: z.preprocess(
      emptyToNull,
      z.coerce.number({ error: 'Tarif harus angka' }).int('Harus bilangan bulat').min(0, 'Tidak boleh negatif').max(99_999_999, 'Terlalu besar').nullable()
    ),
    image_path: z.preprocess(emptyToNull, z.string().regex(IMAGE_PATH, 'Path foto tidak valid').nullable()),

    // Isi katalog publik
    description: z.preprocess(
      (v) => (typeof v === 'string' ? emptyToNull(v.trim()) : emptyToNull(v)),
      z.string().max(500, 'Deskripsi maksimal 500 karakter').nullable()
    ),
    capacity_kva: z.preprocess(
      emptyToNull,
      z.coerce.number({ error: 'Kapasitas harus angka' }).int('Kapasitas harus bilangan bulat').min(1, 'Kapasitas minimal 1 kVA').max(5000, 'Kapasitas terlalu besar').nullable()
    ),

    // Kontrol katalog publik
    is_public: z.boolean({ error: 'Status tampil tidak valid' }),
    is_featured: z.boolean({ error: 'Status unggulan tidak valid' }),
    sort_order: z.coerce.number({ error: 'Urutan harus angka' }).int('Urutan harus bilangan bulat').min(0, 'Urutan minimal 0').max(9999, 'Urutan maksimal 9999'),
  })
  .superRefine((v, ctx) => {
    if (v.capacity_kva !== null && v.category !== 'rental') {
      ctx.addIssue({ code: 'custom', path: ['capacity_kva'], message: 'Kapasitas kVA hanya untuk produk rental (genset)' })
    }
  })

export type Product = {
  id: string
  name: string
  category: 'rental' | 'sales'
  base_price: number
  total_stock: number
  overtime_rate: number | null
  image_path: string | null
  description: string | null
  capacity_kva: number | null
  is_public: boolean
  is_featured: boolean
  sort_order: number
}

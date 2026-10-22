import { createClient } from '@/lib/supabase/server'
import { ProductsTable } from '@/components/dashboard/products/products-table'
import type { Product } from '@/lib/validations/product'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, base_price, total_stock, overtime_rate, image_path, description, capacity_kva, is_public, is_featured, sort_order')
    .order('sort_order')
    .order('name')

  if (error) {
    return <p className="text-sm text-destructive">Gagal memuat produk: {error.message}</p>
  }

  const products: Product[] = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    base_price: Number(p.base_price),
    total_stock: p.total_stock,
    overtime_rate: p.overtime_rate === null ? null : Number(p.overtime_rate),
    image_path: p.image_path ?? null,
    description: p.description ?? null,
    capacity_kva: p.capacity_kva ?? null,
    is_public: p.is_public ?? true,
    is_featured: p.is_featured ?? false,
    sort_order: p.sort_order ?? 0,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Produk</h1>
        <p className="text-sm text-muted-foreground">Kelola katalog sewa dan penjualan sparepart, termasuk apa yang tampil di katalog publik.</p>
      </div>
      <ProductsTable products={products} />
    </div>
  )
}

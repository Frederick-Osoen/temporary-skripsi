import { createClient } from '@/lib/supabase/server'
import { ProductsTable } from '@/components/dashboard/products/products-table'
import type { Product } from '@/lib/validations/product'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, base_price, total_stock')
    .order('name')

  if (error) {
    return <p className="text-sm text-destructive">Gagal memuat produk: {error.message}</p>
  }

  const products: Product[] = (data ?? []).map((p) => ({ ...p, base_price: Number(p.base_price) }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Produk</h1>
        <p className="text-sm text-muted-foreground">Kelola katalog sewa dan penjualan sparepart.</p>
      </div>
      <ProductsTable products={products} />
    </div>
  )
}
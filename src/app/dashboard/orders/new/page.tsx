import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OrderForm } from '@/components/dashboard/orders/order-form'
import type { OrderProduct } from '@/lib/validations/order'

export default async function NewOrderPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, base_price, total_stock')
    .order('category')
    .order('name')

  if (error) return <p className="text-sm text-destructive">Gagal memuat produk: {error.message}</p>

  const products: OrderProduct[] = (data ?? []).map((p) => ({ ...p, base_price: Number(p.base_price) }))

  return (
    <div className="space-y-4">
      <div>
        <Link href="/dashboard/orders" className="text-sm text-muted-foreground hover:underline">
          ← Kembali ke daftar pesanan
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Pesanan Baru</h1>
        <p className="text-sm text-muted-foreground">Input pesanan hasil negosiasi WhatsApp.</p>
      </div>
      <OrderForm products={products} />
    </div>
  )
}
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrderDetail, toFormValues } from '@/lib/orders/detail'
import { isTerminal, STATUS_LABEL } from '@/lib/orders/status'
import { OrderForm } from '@/components/dashboard/orders/order-form'
import type { OrderProduct } from '@/lib/validations/order'

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()

  const supabase = await createClient()
  const [{ data: order, error }, productsRes] = await Promise.all([
    getOrderDetail(supabase, id),
    supabase.from('products').select('id, name, category, base_price, total_stock').order('category').order('name'),
  ])
  if (error || productsRes.error) {
    return <p className="text-sm text-destructive">Gagal memuat data: {error ?? productsRes.error?.message}</p>
  }
  if (!order) notFound()

  if (isTerminal(order.status)) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Pesanan {order.order_code} berstatus {STATUS_LABEL[order.status]} dan sudah terkunci, tidak bisa diedit.
        </p>
        <Link href={`/dashboard/orders/${order.id}`} className="text-sm hover:underline">← Kembali ke detail</Link>
      </div>
    )
  }

  const products: OrderProduct[] = (productsRes.data ?? []).map((p) => ({ ...p, base_price: Number(p.base_price) }))

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/dashboard/orders/${order.id}`} className="text-sm text-muted-foreground hover:underline">
          ← Kembali ke detail
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Edit Pesanan {order.order_code}</h1>
      </div>
      {/* key berisi version: setelah "Muat data terbaru", form dibuat ulang dengan data terbaru */}
      <OrderForm
        key={`${order.id}:${order.version}`}
        mode="edit"
        products={products}
        initialValues={toFormValues(order)}
        orderId={order.id}
        version={order.version}
      />
    </div>
  )
}
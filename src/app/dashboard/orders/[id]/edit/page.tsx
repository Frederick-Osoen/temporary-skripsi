import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdmin } from '@/lib/auth'
import { getOrderDetail, toFormValues } from '@/lib/orders/detail'
import { isTerminal, STATUS_LABEL } from '@/lib/orders/status'
import { OrderForm } from '@/components/dashboard/orders/order-form'
import { AuthProblem } from '@/components/dashboard/auth-problem'
import type { OrderProduct } from '@/lib/validations/order'

export default async function EditOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ override?: string }>
}) {
  const { id } = await params
  const { override } = await searchParams
  if (!z.string().uuid().safeParse(id).success) notFound()

  const supabase = await createClient()
  const [admin, { data: order, error }, productsRes] = await Promise.all([
    getCurrentAdmin(),
    getOrderDetail(supabase, id),
    supabase.from('products').select('id, name, category, base_price, total_stock').order('category').order('name'),
  ])
  if (!admin.ok) return <AuthProblem code={admin.code} message={admin.error} />
  
  if (error || productsRes.error) {
    return <p className="text-sm text-destructive">Gagal memuat data: {error ?? productsRes.error?.message}</p>
  }
  if (!order) notFound()

  const terminal = isTerminal(order.status)
  const overrideMode = terminal && admin.role === 'owner' && override === '1'

  if (terminal && !overrideMode) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Pesanan {order.order_code} berstatus {STATUS_LABEL[order.status]} dan terkunci.
          {admin.role === 'owner' ? ' Sebagai owner, Anda dapat membuka kunci dengan alasan tertulis.' : ' Hanya owner yang dapat membuka kunci.'}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">← Kembali ke detail</Link>
          {admin.role === 'owner' && (
            <Link href={`/dashboard/orders/${order.id}/edit?override=1`} className="font-medium underline">
              Buka Kunci &amp; Edit
            </Link>
          )}
        </div>
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
        <h1 className="mt-1 text-xl font-semibold">
          {overrideMode ? 'Buka Kunci' : 'Edit Pesanan'} {order.order_code}
        </h1>
      </div>
      <OrderForm
        key={`${order.id}:${order.version}`}
        mode="edit"
        products={products}
        initialValues={toFormValues(order)}
        orderId={order.id}
        version={order.version}
        overrideMode={overrideMode}
        overtimeFee={order.overtime_fee}
      />
    </div>
  )
}
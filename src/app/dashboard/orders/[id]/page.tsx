import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getOrderDetail } from '@/lib/orders/detail'
import { OrderDetail } from '@/components/dashboard/orders/order-detail'

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ updated?: string }>
}) {
  const { id } = await params
  const { updated } = await searchParams
  if (!z.string().uuid().safeParse(id).success) notFound()

  const supabase = await createClient()
  const { data, error } = await getOrderDetail(supabase, id)
  if (error) return <p className="text-sm text-destructive">Gagal memuat pesanan: {error}</p>
  if (!data) notFound()

  return (
    <div className="space-y-4">
      <Link href="/dashboard/orders" className="text-sm text-muted-foreground hover:underline">
        ← Kembali ke daftar pesanan
      </Link>
      <OrderDetail order={data} updated={!!updated} />
    </div>
  )
}
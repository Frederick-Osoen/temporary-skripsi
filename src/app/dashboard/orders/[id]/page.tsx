import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getCurrentAdmin } from '@/lib/auth'
import { getOrderDetail, getOrderHistory, getOrderPayments, getOrderSchedules } from '@/lib/orders/detail'
import { OrderDetail } from '@/components/dashboard/orders/order-detail'
import { AuthProblem } from '@/components/dashboard/auth-problem'
import { getAllocationData } from '@/lib/orders/allocation'


export default async function OrderDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ updated?: string; duplicate?: string }>
}) {
  const { id } = await params
  const { updated, duplicate } = await searchParams
  if (!z.string().uuid().safeParse(id).success) notFound()

  const supabase = await createClient()
  const [admin, orderRes, paymentsRes, historyRes, scheduleRes] = await Promise.all([
    getCurrentAdmin(),
    getOrderDetail(supabase, id),
    getOrderPayments(supabase, id),
    getOrderHistory(supabase, id),
    getOrderSchedules(supabase, id),
  ])

  if (!admin.ok) return <AuthProblem code={admin.code} message={admin.error} />
  if (orderRes.error) return <p className="text-sm text-destructive">Gagal memuat pesanan: {orderRes.error}</p>
  if (!orderRes.data) notFound()
  const allocationRes = await getAllocationData(supabase, orderRes.data)
  if (allocationRes.error) {
    return <p className="text-sm text-destructive">Gagal memuat alokasi unit: {allocationRes.error}</p>
  }
  if (paymentsRes.error || historyRes.error || scheduleRes.error) {
    return <p className="text-sm text-destructive">Gagal memuat data pendukung: {paymentsRes.error ?? historyRes.error ?? scheduleRes.error}</p>
  }

  return (
    <div className="space-y-4">
      <Link href="/dashboard/orders" className="text-sm text-muted-foreground hover:underline">← Kembali ke daftar pesanan</Link>
      <OrderDetail order={orderRes.data} payments={paymentsRes.data} history={historyRes.data} role={admin.role} updated={!!updated} duplicate={!!duplicate} allocation={allocationRes.data} schedules={scheduleRes.data} />
    </div>
  )
}
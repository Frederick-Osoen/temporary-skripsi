import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { STATUS_LABEL, ORDER_STATUSES, type OrderStatus } from '@/lib/orders/status'

export const dynamic = 'force-dynamic'

const esc = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v)
  // Cegah formula injection saat dibuka di Excel
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return new NextResponse('Unauthorized', { status: 401 })

  const sp = new URL(request.url).searchParams
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.get('from') ?? '') ? sp.get('from')! : null
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.get('to') ?? '') ? sp.get('to')! : null
  const status = sp.get('status')

  const supabase = await createClient()
  let q = supabase
    .from('orders')
    .select('order_code, created_at, status, start_date, end_date, destination, fleet_type, shipping_fee, fuel_fee, toll_fee, overtime_fee, total_amount, customers(name, phone_number)')
    .order('created_at', { ascending: false })
    .limit(5000)
  if (from) q = q.gte('start_date', from)
  if (to) q = q.lte('start_date', to)
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return new NextResponse('Gagal mengekspor', { status: 500 })

  const head = ['Kode', 'Dibuat', 'Status', 'Pelanggan', 'No. WA', 'Mulai', 'Selesai', 'Tujuan', 'Armada', 'Ongkir', 'BBM', 'Tol', 'Lembur', 'Total']
  const rows = (data ?? []).map((o) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = o as any
    const c = Array.isArray(r.customers) ? r.customers[0] : r.customers
    return [
      r.order_code, String(r.created_at).slice(0, 10), STATUS_LABEL[r.status as OrderStatus] ?? r.status,
      c?.name, c?.phone_number, r.start_date, r.end_date, r.destination, r.fleet_type,
      r.shipping_fee, r.fuel_fee, r.toll_fee, r.overtime_fee, r.total_amount,
    ].map(esc).join(',')
  })
  const csv = '﻿' + [head.join(','), ...rows].join('\r\n')
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pesanan-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

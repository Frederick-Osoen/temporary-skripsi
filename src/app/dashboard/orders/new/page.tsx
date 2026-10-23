import Link from 'next/link'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { OrderForm, type LeadBanner } from '@/components/dashboard/orders/order-form'
import { leadToOrderValues, type LeadRow } from '@/lib/leads'
import type { OrderProduct } from '@/lib/validations/order'

const uuid = z.string().uuid()
const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const { lead: leadParam } = await searchParams
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, base_price, total_stock')
    .order('category')
    .order('name')

  if (error) return <p className="text-sm text-destructive">Gagal memuat produk: {error.message}</p>
  const products: OrderProduct[] = (data ?? []).map((p) => ({ ...p, base_price: Number(p.base_price) }))

  // Bila dibuka dari halaman Leads: isi form otomatis dari estimasi pelanggan
  let notice: { kind: 'error' | 'info'; text: string; href?: string } | null = null
  let initialValues
  let banner: LeadBanner | undefined

  if (leadParam) {
    if (!uuid.safeParse(leadParam).success) {
      notice = { kind: 'error', text: 'Tautan lead tidak valid. Form dibuka kosong.' }
    } else {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, created_at, customer_name, payload, total_estimate, status, converted_order_id')
        .eq('id', leadParam)
        .maybeSingle()

      if (leadError) {
        notice = { kind: 'error', text: 'Gagal memuat lead. Form dibuka kosong.' }
      } else if (!lead) {
        notice = { kind: 'error', text: 'Lead tidak ditemukan. Form dibuka kosong.' }
      } else if (lead.status === 'converted') {
        notice = {
          kind: 'info',
          text: 'Lead ini sudah dijadikan pesanan. Membuat pesanan lagi akan menggandakan data.',
          href: lead.converted_order_id ? `/dashboard/orders/${lead.converted_order_id}` : undefined,
        }
      } else {
        const row: LeadRow = {
          id: lead.id,
          created_at: lead.created_at,
          customer_name: lead.customer_name,
          payload: lead.payload ?? null,
          total_estimate: Number(lead.total_estimate ?? 0),
          status: lead.status,
          converted_order_id: lead.converted_order_id ?? null,
        }
        const prefill = leadToOrderValues(row, products)
        initialValues = prefill.values
        banner = {
          id: lead.id,
          name: lead.customer_name,
          createdAt: dateTime.format(new Date(lead.created_at)),
          info: prefill.info,
          warnings: prefill.warnings,
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href={banner ? '/dashboard/leads' : '/dashboard/orders'} className="text-sm text-muted-foreground hover:underline">
          ← Kembali ke {banner ? 'daftar lead' : 'daftar pesanan'}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Pesanan Baru</h1>
        <p className="text-sm text-muted-foreground">
          {banner ? 'Dibuat dari lead pelanggan.' : 'Input pesanan hasil negosiasi WhatsApp.'}
        </p>
      </div>

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-md px-3 py-2 text-sm ${notice.kind === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-amber-50 text-amber-900'}`}
        >
          {notice.text}{' '}
          {notice.href && <Link href={notice.href} className="underline">Lihat pesanan</Link>}
        </p>
      )}

      <OrderForm products={products} lead={banner} initialValues={initialValues} />
    </div>
  )
}

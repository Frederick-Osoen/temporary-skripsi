'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/auth'
import type { ActionCode, ActionData, ActionFail } from '@/lib/action-client'
import { normalizePhone } from '@/lib/phone'
import { calcItemsTotal, rentalDays, resolveShipping, type ResolvedShipping } from '@/lib/orders/utils'
import { ORDER_STATUSES, isTransitionAllowed, type OrderStatus } from '@/lib/orders/status'
import {
  MAX_ORDER_TOTAL,
  PICKUP_DESTINATION,
  orderFormSchema,
  type CustomerLookup,
  type OrderFormValues,
} from '@/lib/validations/order'

const fail = (error: string, code?: ActionCode): ActionFail => ({ ok: false, error, code })

async function guard<T>(fn: () => Promise<ActionData<T>>): Promise<ActionData<T>> {
  try {
    return await fn()
  } catch (err) {
    console.error('[orders] error tak terduga:', err)
    return fail('Terjadi kesalahan pada server. Coba lagi.')
  }
}

// Kode kustom JJ001-JJ004 berasal dari fungsi/trigger database
function mapDbError(error: { code?: string; message?: string }): ActionFail {
  const code = error.code ?? ''
  const msg = error.message ?? ''
  const is = (c: string, token: string) => code === c || msg.includes(token)

  if (is('JJ001', 'ORDER_LOCKED')) return fail('Pesanan sudah selesai atau dibatalkan, tidak bisa diubah lagi.')
  if (is('JJ002', 'INVALID_TRANSITION')) return fail('Perubahan status tidak diizinkan.')
  if (is('JJ003', 'VERSION_CONFLICT')) {
    return fail('Pesanan ini baru saja diubah pihak lain. Muat data terbaru lalu coba lagi.', 'CONFLICT')
  }
  if (is('JJ004', 'ORDER_NOT_FOUND')) return fail('Pesanan tidak ditemukan.')
  switch (code) {
    case '42501': return fail('Akses ditolak', 'FORBIDDEN')
    case '23503': return fail('Ada produk yang tidak ditemukan atau sudah dihapus.')
    case '23514': return fail('Data melanggar aturan database. Periksa tanggal dan jumlah.')
    case '22003': return fail('Nilai terlalu besar. Periksa harga dan jumlah.')
    case '23505': return fail('Bentrok kode pesanan. Coba simpan lagi.')
    default:
      console.error('[orders] db error:', error)
      return fail('Gagal menyimpan pesanan')
  }
}

// Validasi server bersama untuk create & update
type Prepared =
  | { ok: true; hasRental: boolean; start: string; end: string; setup: string; shipping: ResolvedShipping }
  | ActionFail

async function prepareOrder(supabase: SupabaseClient, v: OrderFormValues): Promise<Prepared> {
  const ids = [...new Set(v.items.map((i) => i.product_id))]
  const { data: products, error } = await supabase.from('products').select('id, category').in('id', ids)
  if (error) {
    console.error('[orders] baca produk:', error)
    return fail('Gagal memeriksa produk')
  }
  if ((products ?? []).length !== ids.length) return fail('Ada produk yang tidak ditemukan atau sudah dihapus.')

  const category = new Map((products ?? []).map((p) => [p.id as string, p.category as string]))
  const hasRental = [...category.values()].includes('rental')
  if (v.delivery_mode === 'store_pickup' && hasRental) return fail('Ambil di toko hanya untuk produk sales.')

  const shipping = resolveShipping(v.delivery_mode, v.shipping)
  if (!shipping.ok) return fail(shipping.error)

  // Pesanan sales saja: tanggal mulai = selesai = pasang
  const start = v.start_date
  const end = hasRental ? v.end_date : start
  const setup = hasRental ? v.setup_date : start
  const days = hasRental ? rentalDays(start, end) : 1

  const itemsTotal = calcItemsTotal(
    v.items.map((i) => ({ qty: i.qty, unit_price: i.unit_price, is_rental: category.get(i.product_id) === 'rental' })),
    days
  )
  if (itemsTotal + shipping.value.shipping_fee > MAX_ORDER_TOTAL) {
    return fail('Total pesanan melebihi batas yang didukung.')
  }

  return { ok: true, hasRental, start, end, setup, shipping: shipping.value }
}

function orderPayload(v: OrderFormValues, p: Extract<Prepared, { ok: true }>) {
  return {
    start_date: p.start,
    end_date: p.end,
    setup_date: p.setup,
    destination: v.delivery_mode === 'store_pickup' ? PICKUP_DESTINATION : v.destination,
    distance_km: p.shipping.distance_km,
    fleet_type: v.delivery_mode === 'store_pickup' ? 'pickup' : v.fleet_type,
    shipping_fee: p.shipping.shipping_fee,
    fuel_fee: p.shipping.fuel_fee,
    toll_fee: p.shipping.toll_fee,
    items: v.items.map((i) => ({
      id: i.line_id ?? null,
      product_id: i.product_id,
      qty: i.qty,
      unit_price: i.unit_price,
    })),
  }
}

export async function findCustomerByPhone(phoneInput: string): Promise<ActionData<CustomerLookup | null>> {
  return guard(async () => {
    const phone = typeof phoneInput === 'string' ? normalizePhone(phoneInput) : null
    if (!phone) return fail('Nomor tidak valid')

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const { data, error } = await ctx.supabase
      .from('customers')
      .select('id, name, type')
      .eq('phone_number', phone)
      .maybeSingle()
    if (error) {
      console.error('[orders] cari customer:', error)
      return fail('Gagal mencari pelanggan')
    }
    return { ok: true, data: data ? { id: data.id, name: data.name, type: data.type } : null }
  })
}

export async function createOrder(input: unknown): Promise<ActionData<{ id: string; code: string }>> {
  return guard(async () => {
    const parsed = orderFormSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data

    const phone = normalizePhone(v.phone)
    if (!phone) return fail('Nomor WhatsApp tidak valid')

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const prep = await prepareOrder(ctx.supabase, v)
    if (!prep.ok) return prep

    const { data, error } = await ctx.supabase.rpc('create_order', {
      p_data: { ...orderPayload(v, prep), phone, customer_name: v.customer_name, customer_type: v.customer_type },
    })
    if (error) return mapDbError(error)

    const result = data as { order_id: string; order_code: string } | null
    if (!result) return fail('Gagal menyimpan pesanan')

    revalidatePath('/dashboard/orders')
    return { ok: true, data: { id: result.order_id, code: result.order_code } }
  })
}

// Edit pesanan dengan optimistic locking. Data pelanggan tidak diubah di sini.
export async function updateOrder(
  id: string,
  version: number,
  input: unknown
): Promise<ActionData<{ id: string; version: number }>> {
  return guard(async () => {
    if (!z.string().uuid().safeParse(id).success || !z.number().int().min(1).safeParse(version).success) {
      return fail('Permintaan tidak valid')
    }
    const parsed = orderFormSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const prep = await prepareOrder(ctx.supabase, v)
    if (!prep.ok) return prep

    const { data, error } = await ctx.supabase.rpc('update_order', {
      p_id: id,
      p_version: version,
      p_data: orderPayload(v, prep),
    })
    if (error) return mapDbError(error)

    const result = data as { version: number } | null
    if (!result) return fail('Gagal memperbarui pesanan')

    revalidatePath('/dashboard/orders')
    revalidatePath(`/dashboard/orders/${id}`)
    return { ok: true, data: { id, version: result.version } }
  })
}

const statusInput = z.object({
  id: z.string().uuid(),
  version: z.number().int().min(1),
  status: z.enum(ORDER_STATUSES),
})

type ItemCategoryRow = { products: { category: string } | { category: string }[] | null }

export async function changeOrderStatus(input: unknown): Promise<ActionData<{ status: OrderStatus; version: number }>> {
  return guard(async () => {
    const parsed = statusInput.safeParse(input)
    if (!parsed.success) return fail('Permintaan tidak valid')
    const { id, version, status: to } = parsed.data

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)
    const supabase = ctx.supabase

    const { data: order, error: readError } = await supabase
      .from('orders')
      .select('status, version, order_items(products(category))')
      .eq('id', id)
      .maybeSingle()
    if (readError) {
      console.error('[orders] baca pesanan:', readError)
      return fail('Gagal membaca pesanan')
    }
    if (!order) return fail('Pesanan tidak ditemukan.')
    if (order.version !== version) return mapDbError({ code: 'JJ003' })

    const hasRental = ((order.order_items ?? []) as unknown as ItemCategoryRow[]).some((i) => {
      const p = Array.isArray(i.products) ? i.products[0] : i.products
      return p?.category === 'rental'
    })
    if (!isTransitionAllowed(order.status as OrderStatus, to, hasRental)) {
      return fail('Perubahan status tidak diizinkan.')
    }

    // Optimistic locking: hanya berhasil jika versi masih sama (trigger menaikkan version)
    const { data, error } = await supabase
      .from('orders')
      .update({ status: to })
      .eq('id', id)
      .eq('version', version)
      .select('status, version')
    if (error) return mapDbError(error)
    if (!data?.length) return mapDbError({ code: 'JJ003' })

    revalidatePath('/dashboard/orders')
    revalidatePath(`/dashboard/orders/${id}`)
    return { ok: true, data: { status: data[0].status as OrderStatus, version: Number(data[0].version) } }
  })
}
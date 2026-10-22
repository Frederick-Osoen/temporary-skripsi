'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, requireAdminProfile } from '@/lib/auth'
import { isNetworkError } from '@/lib/db-errors'
import type { ActionCode, ActionData, ActionFail } from '@/lib/action-client'
import { normalizePhone } from '@/lib/phone'
import { calcItemsTotal, rentalDays, resolveShipping, type ResolvedShipping } from '@/lib/orders/utils'
import { ORDER_STATUSES, type OrderStatus } from '@/lib/orders/status'
import { allocationSchema } from '@/lib/validations/allocation'
import { scheduleSchema, extendSchema } from '@/lib/validations/operations'
import { paymentSchema, paymentEditSchema, paymentDeleteSchema } from '@/lib/validations/payment'
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
  if (isNetworkError(error)) {
    return fail(
      'Koneksi ke database terputus. Data mungkin sudah tersimpan, muat ulang halaman untuk memastikan.',
      'UNAVAILABLE'
    )
  }
  const code = error.code ?? ''
  const msg = error.message ?? ''
  const is = (c: string, token: string) => code === c || msg.includes(token)

  if (is('JJ001', 'ORDER_LOCKED')) return fail('Pesanan sudah selesai atau dibatalkan dan terkunci. Hanya owner yang dapat membuka kunci.')
  if (is('JJ002', 'INVALID_TRANSITION')) return fail('Perubahan status tidak diizinkan.')
  if (is('JJ003', 'VERSION_CONFLICT')) {
    return fail('Pesanan ini baru saja diubah pihak lain. Muat data terbaru lalu coba lagi.', 'CONFLICT')
  }
  if (is('JJ004', 'ORDER_NOT_FOUND')) return fail('Pesanan tidak ditemukan.')
  if (is('JJ005', 'TOTAL_BELOW_PAID')) return fail('Total pesanan tidak boleh lebih kecil dari pembayaran yang sudah diterima.')
  if (is('JJ006', 'PAYMENT_INCOMPLETE')) return fail('Pesanan belum lunas. Catat pembayaran sisa tagihan terlebih dahulu.')
  if (is('JJ007', 'PAYMENT_REQUIRED')) return fail('Catat pembayaran DP terlebih dahulu.')
  if (is('JJ008', 'OVERRIDE_REASON_REQUIRED')) return fail('Alasan buka kunci wajib diisi (minimal 5 karakter).')
  if (is('JJ009', 'OVERPAYMENT')) return fail('Nominal melebihi sisa tagihan.')
  if (is('JJ010', 'DP_NOT_ALLOWED')) return fail('DP hanya untuk pembayaran pertama. Gunakan jenis Termin.')
  if (is('JJ011', 'NOT_FULL_AMOUNT')) return fail('Pelunasan harus sama dengan sisa tagihan.')
  if (is('JJ012', 'NOTE_REQUIRED')) return fail('Alasan pembatalan wajib diisi.')
  if (is('JJ013', 'INVALID_PAYMENT_DATE')) return fail('Tanggal pembayaran tidak boleh di masa depan.')
  if (is('JJ014', 'OWNER_ONLY')) return fail('Pesanan sudah final. Hanya owner yang dapat mengubah pembayarannya.', 'FORBIDDEN')
  if (is('JJ015', 'PAYMENT_NOT_FOUND')) return fail('Pembayaran tidak ditemukan (mungkin sudah dihapus). Muat ulang halaman.', 'CONFLICT')
  if (is('JJ016', 'LAST_PAYMENT_REQUIRED')) return fail('Acara sudah berjalan atau selesai, jadi pembayaran terakhir tidak bisa dihapus. Ubah nominalnya saja.')
  if (is('JJ017', 'REASON_REQUIRED')) return fail('Alasan wajib diisi (minimal 5 karakter).')
  if (is('JJ018', 'NO_CHANGES')) return fail('Tidak ada perubahan yang dilakukan.')
  if (is('JJ019', 'COMPLETED_MUST_STAY_PAID')) return fail('Pesanan Selesai harus tetap lunas: total pembayaran harus sama dengan total tagihan, dan pembayaran tidak bisa dihapus.')
  if (is('JJ020', 'UNIT_CONFLICT')) {
    const [, unit, order] = msg.split('|')
    return fail(
      unit && order
        ? `Unit ${unit} sudah dipakai pesanan ${order} pada tanggal yang bertabrakan. Pilih unit lain atau sesuaikan tanggal.`
        : 'Unit bertabrakan dengan pesanan lain pada tanggal tersebut.',
      'CONFLICT'
    )
  }
  if (is('JJ021', 'ALLOCATION_EXCEEDS_QTY')) {
    return fail('Jumlah unit teralokasi tidak boleh melebihi jumlah item. Jika mengurangi jumlah item, lepas dulu alokasi unitnya.')
  }
  if (is('JJ022', 'ITEM_NOT_FOUND')) return fail('Item pesanan tidak ditemukan. Muat ulang halaman.', 'CONFLICT')
  if (is('JJ023', 'NOT_RENTAL_ITEM')) return fail('Hanya produk rental yang membutuhkan alokasi unit.')
  if (is('JJ024', 'UNIT_INVALID')) return fail('Ada unit yang tidak sesuai dengan produk pesanan.')
  if (is('JJ025', 'UNIT_NOT_AVAILABLE')) {
    const unit = msg.split('|')[1]
    return fail(`Unit ${unit ?? ''} tidak berstatus Tersedia (maintenance/rusak). Pilih unit lain.`, 'CONFLICT')
  }
  if (is('JJ026', 'DUPLICATE_UNIT')) return fail('Ada unit yang dipilih lebih dari sekali.')
  if (is('JJ027', 'INVALID_EXTENSION')) return fail('Jumlah hari perpanjangan harus 1-30.')
  if (is('JJ028', 'NO_RENTAL_ITEMS')) return fail('Perpanjangan hanya untuk pesanan yang berisi produk rental.')
  if (is('JJ029', 'DUPLICATE_DAY')) return fail('Ada tanggal jadwal yang diisi lebih dari sekali.')
  if (is('JJ030', 'SCHEDULE_OUT_OF_RANGE')) return fail('Ada jadwal operasional di luar rentang tanggal sewa. Sesuaikan jadwal operasionalnya terlebih dahulu.')
  if (is('JJ031', 'INVALID_SCHEDULE')) return fail('Jadwal tidak valid. Periksa jam mulai dan selesai.')
  
    switch (code) {
    case '42501': return fail('Akses ditolak', 'FORBIDDEN')
    case '23503': return fail('Ada produk yang tidak ditemukan atau sudah dihapus.')
    case '23514': return fail('Data melanggar aturan database. Periksa tanggal dan jumlah.')
    case '22003': return fail('Nilai terlalu besar. Periksa harga dan jumlah.')
    case '22023': return fail('Data tidak valid. Periksa kembali isian Anda.')
    case '23505': return fail('Bentrok kode pesanan. Coba simpan lagi.')
    default:
      console.error('[orders] db error:', error)
      return fail('Gagal menyimpan data')
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

export async function createOrder(
  input: unknown,
  requestId: string
): Promise<ActionData<{ id: string; code: string; duplicate: boolean }>> {
  return guard(async () => {
    if (!z.string().uuid().safeParse(requestId).success) return fail('Permintaan tidak valid')

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
      p_data: {
        ...orderPayload(v, prep),
        client_request_id: requestId,
        phone,
        customer_name: v.customer_name,
        customer_type: v.customer_type,
      },
    })
    if (error) return mapDbError(error)

    const result = data as { order_id: string; order_code: string; duplicate?: boolean } | null
    if (!result) return fail('Gagal menyimpan pesanan')

    revalidatePath('/dashboard/orders')
    return { ok: true, data: { id: result.order_id, code: result.order_code, duplicate: !!result.duplicate } }
  })
}

// Edit pesanan. overrideReason hanya untuk owner pada pesanan yang sudah terkunci.
export async function updateOrder(
  id: string,
  version: number,
  input: unknown,
  overrideReason?: string
): Promise<ActionData<{ id: string; version: number }>> {
  return guard(async () => {
    if (!z.string().uuid().safeParse(id).success || !z.number().int().min(1).safeParse(version).success) {
      return fail('Permintaan tidak valid')
    }
    const parsed = orderFormSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data

    const ctx = await requireAdminProfile()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const reason = typeof overrideReason === 'string' ? overrideReason.trim() : ''
    if (reason && ctx.role !== 'owner') return fail('Hanya owner yang dapat membuka kunci pesanan.', 'FORBIDDEN')
    if (reason && (reason.length < 5 || reason.length > 500)) return fail('Alasan harus 5-500 karakter.')

    const prep = await prepareOrder(ctx.supabase, v)
    if (!prep.ok) return prep

    const { data, error } = await ctx.supabase.rpc('update_order', {
      p_id: id,
      p_version: version,
      p_data: orderPayload(v, prep),
      p_override_reason: reason || null,
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
  note: z.string().trim().max(500).optional(),
})


export async function changeOrderStatus(input: unknown): Promise<ActionData<{ status: OrderStatus; version: number }>> {
  return guard(async () => {
    const parsed = statusInput.safeParse(input)
    if (!parsed.success) return fail('Permintaan tidak valid')
    const { id, version, status: to, note } = parsed.data

    // DP Diterima hanya lewat pencatatan pembayaran
    if (to === 'dp_received') return fail('Catat pembayaran DP untuk memajukan status ini.')

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const { data, error } = await ctx.supabase.rpc('change_order_status', {
      p_id: id,
      p_version: version,
      p_status: to,
      p_note: note || null,
    })
    if (error) return mapDbError(error)

    const result = data as { status: OrderStatus; version: number } | null
    if (!result) return fail('Gagal mengubah status')

    revalidatePath('/dashboard/orders')
    revalidatePath(`/dashboard/orders/${id}`)
    return { ok: true, data: { status: result.status, version: Number(result.version) } }
  })
}

export async function recordPayment(
  input: unknown
): Promise<ActionData<{ status: OrderStatus; version: number; paid: number; remaining: number }>> {
  return guard(async () => {
    const parsed = paymentSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const { data, error } = await ctx.supabase.rpc('record_payment', {
      p_order_id: v.order_id,
      p_version: v.version,
      p_data: { type: v.type, amount: v.amount, method: v.method, paid_at: v.paid_at, notes: v.notes },
    })
    if (error) return mapDbError(error)

    const r = data as { status: OrderStatus; version: number; paid: number; remaining: number } | null
    if (!r) return fail('Gagal mencatat pembayaran')

    revalidatePath('/dashboard/orders')
    revalidatePath(`/dashboard/orders/${v.order_id}`)
    return {
      ok: true,
      data: { status: r.status, version: Number(r.version), paid: Number(r.paid), remaining: Number(r.remaining) },
    }
  })
}


type PaymentChange = { version: number; paid: number; remaining: number }

export async function editPayment(input: unknown): Promise<ActionData<PaymentChange>> {
  return guard(async () => {
    const parsed = paymentEditSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const { data, error } = await ctx.supabase.rpc('edit_payment', {
      p_payment_id: v.payment_id,
      p_version: v.version,
      p_data: { type: v.type, amount: v.amount, method: v.method, paid_at: v.paid_at, notes: v.notes },
      p_reason: v.reason,
    })
    if (error) return mapDbError(error)

    const r = data as PaymentChange | null
    if (!r) return fail('Gagal memperbarui pembayaran')

    revalidatePath('/dashboard/orders/[id]', 'page')
    return { ok: true, data: { version: Number(r.version), paid: Number(r.paid), remaining: Number(r.remaining) } }
  })
}

export async function deletePayment(input: unknown): Promise<ActionData<PaymentChange>> {
  return guard(async () => {
    const parsed = paymentDeleteSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const { data, error } = await ctx.supabase.rpc('delete_payment', {
      p_payment_id: v.payment_id,
      p_version: v.version,
      p_reason: v.reason,
    })
    if (error) return mapDbError(error)

    const r = data as PaymentChange | null
    if (!r) return fail('Gagal menghapus pembayaran')

    revalidatePath('/dashboard/orders/[id]', 'page')
    return { ok: true, data: { version: Number(r.version), paid: Number(r.paid), remaining: Number(r.remaining) } }
  })
}

export async function saveAllocation(
  input: unknown
): Promise<ActionData<{ version: number; assigned: number; outsourced: number; needed: number }>> {
  return guard(async () => {
    const parsed = allocationSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const { data, error } = await ctx.supabase.rpc('set_order_allocation', {
      p_order_id: v.order_id,
      p_version: v.version,
      p_data: { items: v.items },
    })
    if (error) return mapDbError(error)

    const r = data as { version: number; assigned: number; outsourced: number; needed: number } | null
    if (!r) return fail('Gagal menyimpan alokasi')

    revalidatePath('/dashboard/orders/[id]', 'page')
    revalidatePath('/dashboard/orders')
    return {
      ok: true,
      data: { version: Number(r.version), assigned: Number(r.assigned), outsourced: Number(r.outsourced), needed: Number(r.needed) },
    }
  })
}

export async function saveSchedule(
  input: unknown
): Promise<ActionData<{ version: number; overtime_fee: number; overtime_hours: number; total_amount: number }>> {
  return guard(async () => {
    const parsed = scheduleSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const { data, error } = await ctx.supabase.rpc('set_order_schedule', {
      p_order_id: v.order_id,
      p_version: v.version,
      p_data: { days: v.days },
    })
    if (error) return mapDbError(error)

    const r = data as { version: number; overtime_fee: number; overtime_hours: number; total_amount: number } | null
    if (!r) return fail('Gagal menyimpan jadwal')

    revalidatePath('/dashboard/orders/[id]', 'page')
    revalidatePath('/dashboard/orders')
    return {
      ok: true,
      data: {
        version: Number(r.version),
        overtime_fee: Number(r.overtime_fee),
        overtime_hours: Number(r.overtime_hours),
        total_amount: Number(r.total_amount),
      },
    }
  })
}

export async function extendOrder(
  input: unknown
): Promise<ActionData<{ version: number; end_date: string; total_amount: number; added_amount: number }>> {
  return guard(async () => {
    const parsed = extendSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0].message)
    const v = parsed.data

    const ctx = await requireAdmin()
    if (!ctx.ok) return fail(ctx.error, ctx.code)

    const { data, error } = await ctx.supabase.rpc('extend_order', {
      p_order_id: v.order_id,
      p_version: v.version,
      p_add_days: v.add_days,
      p_reason: v.reason || null,
    })
    if (error) return mapDbError(error)

    const r = data as { version: number; end_date: string; total_amount: number; added_amount: number } | null
    if (!r) return fail('Gagal memperpanjang sewa')

    revalidatePath('/dashboard/orders/[id]', 'page')
    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard/calendar')
    return {
      ok: true,
      data: {
        version: Number(r.version),
        end_date: r.end_date,
        total_amount: Number(r.total_amount),
        added_amount: Number(r.added_amount),
      },
    }
  })
}
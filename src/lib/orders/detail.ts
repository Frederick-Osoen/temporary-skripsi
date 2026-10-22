import type { SupabaseClient } from '@supabase/supabase-js'
import { PICKUP_DESTINATION, type OrderFormValues } from '@/lib/validations/order'
import type { OrderStatus } from './status'
import type { PaymentRow } from './payments'
import type { ScheduleRow } from './schedule'

export type PaymentSnapshot = {
  type: string
  amount: number
  method: string
  paid_at: string // YYYY-MM-DD
  notes: string | null
}

export type HistoryRow = {
  id: string
  // [UPDATE CLAUDE]: Tambah 'schedule' dan 'extension'
  action: 'created' | 'status_change' | 'override_edit' | 'payment_edit' | 'payment_delete' | 'allocation' | 'schedule' | 'extension'
  from_status: OrderStatus | null
  to_status: OrderStatus
  note: string | null
  created_at: string
  changed_by_name: string | null
  details:
    | {
        payment_id?: string
        before?: PaymentSnapshot | null
        after?: PaymentSnapshot | null
        assigned?: number
        outsourced?: number
        needed?: number
        units?: string[]
        // [UPDATE CLAUDE]: Tambahan details untuk overtime dan perpanjangan
        days?: number
        overtime_hours?: number
        overtime_fee?: number
        old_end?: string
        new_end?: string
        added_days?: number
        old_total?: number
        new_total?: number
      }
    | null
}

export const ORDER_DETAIL_SELECT =
  'id, order_code, status, version, created_at, start_date, end_date, setup_date, destination, distance_km, ' +
  'fleet_type, shipping_fee, fuel_fee, toll_fee, overtime_fee, total_amount, customers(id, name, phone_number, type), ' +
  'order_items(id, product_id, qty, unit_price, subtotal, products(name, category, overtime_rate))'

export type OrderDetailItem = {
  id: string
  product_id: string
  name: string
  category: 'rental' | 'sales'
  qty: number
  unit_price: number
  overtime_rate: number | null
  subtotal: number
}

export type OrderDetailData = {
  id: string
  order_code: string
  status: OrderStatus
  version: number
  created_at: string
  start_date: string
  end_date: string
  setup_date: string
  destination: string
  distance_km: number
  fleet_type: 'pickup' | 'truck'
  shipping_fee: number
  fuel_fee: number
  toll_fee: number
  overtime_fee: number
  total_amount: number
  customer: { id: string; name: string; phone_number: string; type: 'regular' | 'corporate' }
  items: OrderDetailItem[]
  hasRental: boolean
}

type One<T> = T | T[] | null
const first = <T,>(v: One<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v)

export async function getOrderDetail(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: OrderDetailData | null; error: string | null }> {
  const { data, error } = await supabase.from('orders').select(ORDER_DETAIL_SELECT).eq('id', id).maybeSingle()
  if (error) return { data: null, error: error.message }
  if (!data) return { data: null, error: null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any
  const customer = first<{ id: string; name: string; phone_number: string; type: 'regular' | 'corporate' }>(r.customers)
  if (!customer) return { data: null, error: 'Data pelanggan tidak ditemukan' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: OrderDetailItem[] = ((r.order_items ?? []) as any[])
    .map((i) => {
      // [UPDATE CLAUDE]: Tambah overtime_rate: number | string | null ke dalam tipe data produk
      const p = first<{ name: string; category: 'rental' | 'sales'; overtime_rate: number | string | null }>(i.products)
      return {
        id: i.id,
        product_id: i.product_id,
        name: p?.name ?? '-',
        category: p?.category ?? 'sales',
        qty: Number(i.qty),
        unit_price: Number(i.unit_price),
        // [UPDATE CLAUDE]: Petakan nilai overtime_rate
        overtime_rate: p?.overtime_rate == null ? null : Number(p.overtime_rate),
        subtotal: Number(i.subtotal),
      } satisfies OrderDetailItem
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

  return {
    data: {
      id: r.id,
      order_code: r.order_code,
      status: r.status,
      version: Number(r.version),
      created_at: r.created_at,
      start_date: r.start_date,
      end_date: r.end_date,
      setup_date: r.setup_date,
      destination: r.destination,
      distance_km: Number(r.distance_km),
      fleet_type: r.fleet_type,
      shipping_fee: Number(r.shipping_fee),
      fuel_fee: Number(r.fuel_fee),
      toll_fee: Number(r.toll_fee),
      // [UPDATE CLAUDE]: Petakan nilai overtime_fee
      overtime_fee: Number(r.overtime_fee ?? 0),
      total_amount: Number(r.total_amount),
      customer,
      items,
      hasRental: items.some((i) => i.category === 'rental'),
    },
    error: null,
  }
}

// Nilai awal form edit. Ongkir dimuat sebagai "manual" agar angka tersimpan tidak berubah sendiri.
// Invarian: shipping_fee = fuel_fee + toll_fee, sehingga BBM/tol pulih persis dari resolveShipping.
export function toFormValues(d: OrderDetailData): OrderFormValues {
  const pickup = d.destination === PICKUP_DESTINATION
  return {
    phone: d.customer.phone_number,
    customer_name: d.customer.name,
    customer_type: d.customer.type,
    delivery_mode: pickup ? 'store_pickup' : 'delivery',
    destination: d.destination,
    fleet_type: d.fleet_type,
    start_date: d.start_date,
    end_date: d.end_date,
    setup_date: d.setup_date,
    items: d.items.map((i) => ({ line_id: i.id, product_id: i.product_id, qty: i.qty, unit_price: i.unit_price })),
    shipping: pickup
      ? { zone: 0, distance_km: 0, auto_fuel_fee: 0, auto_toll_fee: 0, toll_override: null, manual_shipping_fee: null }
      : {
          zone: 3,
          distance_km: d.distance_km,
          auto_fuel_fee: d.fuel_fee,
          auto_toll_fee: d.toll_fee,
          toll_override: d.toll_fee,
          manual_shipping_fee: d.shipping_fee,
        },
  }
}

export async function getOrderPayments(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ data: PaymentRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('id, payment_type, payment_method, amount, payment_date, notes, admins(name)')
    .eq('order_id', orderId)
    .order('payment_date')
    .order('created_at')
  if (error) return { data: [], error: error.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    payment_type: r.payment_type,
    payment_method: r.payment_method,
    amount: Number(r.amount),
    payment_date: r.payment_date,
    notes: r.notes,
    recorded_by: first<{ name: string }>(r.admins)?.name ?? null,
  })) as PaymentRow[]
  return { data: rows, error: null }
}

export async function getOrderHistory(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ data: HistoryRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('id, action, from_status, to_status, note, details, created_at, admins(name)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
  if (error) return { data: [], error: error.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    action: r.action,
    from_status: r.from_status,
    to_status: r.to_status,
    note: r.note,
    details: r.details ?? null,
    created_at: r.created_at,
    changed_by_name: first<{ name: string }>(r.admins)?.name ?? null,
  })) as HistoryRow[]
  return { data: rows, error: null }
}

// [UPDATE CLAUDE]: Fungsi baru untuk mendapatkan data jadwal operasional
export async function getOrderSchedules(
  supabase: SupabaseClient,
  orderId: string
): Promise<{ data: ScheduleRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('order_schedules')
    .select('schedule_date, start_time, end_time, operating_hours, overtime_hours')
    .eq('order_id', orderId)
    .order('schedule_date')
  if (error) return { data: [], error: error.message }

  return {
    data: (data ?? []).map((r) => ({
      schedule_date: r.schedule_date as string,
      start_time: String(r.start_time).slice(0, 5),
      end_time: String(r.end_time).slice(0, 5),
      operating_hours: Number(r.operating_hours),
      overtime_hours: Number(r.overtime_hours),
    })),
    error: null,
  }
}
import { z } from 'zod'
import { normalizePhone } from '@/lib/phone'
import { rentalDays } from '../orders/utils'

export const PICKUP_DESTINATION = 'Pickup di Toko'
export const MAX_ORDER_TOTAL = 9_999_999_999 // batas NUMERIC(12,2)

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal wajib diisi')

const rupiah = z
    .number({ error: 'Isi dengan angka' })
    .int('Harus bilangan bulat')
    .min(0, 'Tidak boleh negatif')
    .max(99_999_999_999, 'Terlalu besar')

export const orderItemSchema = z.object({
    line_id: z.string().uuid().nullable().optional(), // id baris order_items  
    product_id: z.string().uuid('Produk tidak valid'),
    qty: z.number({ error: 'Isi dengan angka' }).int('Harus bilangan bulat').min(1, 'Minimal 1').max(1000, 'Maksimal 1000'),
    unit_price: rupiah,
})

// zone: 0 = belum dihitung, 1-3 = hasil /api/distance (atau 3 untuk mode manual)
export const shippingSchema = z.object({
    zone: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    distance_km: z.number({ error: 'Isi dengan angka' }).min(0, 'Tidak boleh negatif').max(5000, 'Terlalu besar'),
    auto_fuel_fee: rupiah,
    auto_toll_fee: rupiah,
    toll_override: rupiah.nullable(),
    manual_shipping_fee: rupiah.nullable(),
})

export const orderFormSchema = z
    .object({
        phone: z.string().trim().min(1, 'Nomor WhatsApp wajib diisi').max(30, 'Terlalu panjang'),
        customer_name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
        customer_type: z.enum(['regular', 'corporate'], { error: 'Tipe pelanggan tidak valid' }),
        delivery_mode: z.enum(['delivery', 'store_pickup']),
        destination: z.string().trim().max(200, 'Maksimal 200 karakter'),
        fleet_type: z.enum(['pickup', 'truck'], { error: 'Armada tidak valid' }),
        start_date: dateStr,
        end_date: dateStr,
        setup_date: dateStr,
        event_type: z.enum(['pernikahan', 'korporat', 'pabrik', 'ulang_tahun', 'lainnya']).nullish(),
        items: z.array(orderItemSchema).min(1, 'Tambahkan minimal satu produk').max(50, 'Maksimal 50 produk'),
        shipping: shippingSchema,
    })
    .superRefine((v, ctx) => {
        const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })

        if (!normalizePhone(v.phone)) issue(['phone'], 'Nomor WhatsApp tidak valid (contoh: 0812 3456 7890)')
        if (v.end_date < v.start_date) issue(['end_date'], 'Tanggal selesai tidak boleh sebelum tanggal mulai')
        if (v.setup_date > v.start_date) issue(['setup_date'], 'Tanggal pasang tidak boleh setelah tanggal mulai')
        if (v.end_date >= v.start_date && rentalDays(v.start_date, v.end_date) > 365) {
            issue(['end_date'], 'Durasi sewa maksimal 365 hari')
        }

        if (v.delivery_mode === 'delivery') {
            if (v.destination.length < 3) issue(['destination'], 'Alamat tujuan minimal 3 karakter')
            if (v.shipping.zone === 0) issue(['shipping', 'zone'], 'Hitung ongkir terlebih dahulu atau isi manual')
            else if (v.shipping.zone === 3 && v.shipping.manual_shipping_fee === null) {
                issue(['shipping', 'manual_shipping_fee'], 'Zona luar kota: ongkir wajib diisi manual')
            }
        }

        const ids = v.items.map((i) => i.product_id)
        if (new Set(ids).size !== ids.length) issue(['items'], 'Ada produk yang duplikat di keranjang')
    })

export type OrderFormValues = z.infer<typeof orderFormSchema>
export type ShippingValues = z.infer<typeof shippingSchema>

export type OrderProduct = {
    id: string
    name: string
    category: 'rental' | 'sales'
    base_price: number
    total_stock: number
}

export type CustomerLookup = { id: string; name: string; type: 'regular' | 'corporate' }
import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyNewLead } from '@/lib/notify/events'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_CHARS = 20_000
const LIMIT = { max: 5, windowSec: 60 } // per IP

const leadSchema = z.object({
  customer_name: z.string().trim().max(100).optional(),
  total_estimate: z.number().int().min(0).max(1_000_000_000),
  payload: z.object({
    items: z
      .array(
        z.object({
          product_id: z.string().uuid(),
          name: z.string().trim().min(1).max(150),
          qty: z.number().int().min(1).max(99),
          category: z.enum(['rental', 'sales']),
        })
      )
      .min(1)
      .max(30),
    start_date: z.string().max(10),
    end_date: z.string().max(10),
    start_time: z.string().max(5).nullable(),
    end_time: z.string().max(5).nullable(),
    day_hours: z
      .array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }))
      .max(90)
      .nullish(),
    event_type: z.enum(['pernikahan', 'korporat', 'pabrik', 'ulang_tahun', 'lainnya']).nullish(),
    delivery: z.enum(['delivery', 'store_pickup']),
    destination: z.string().trim().max(200).nullable(),
    fleet: z.string().max(100).nullable(),
    fleet_pickups: z.number().int().min(0).max(50),
    fleet_trucks: z.number().int().min(0).max(50),
    distance_km: z.number().min(0).max(5000).nullable(),
    shipping_pending: z.boolean(),
    notes: z.array(z.string().max(300)).max(10),
  }),
})

const ok = () => NextResponse.json({ ok: true })

export async function POST(request: Request) {
  // 1) Baca body dengan batas ukuran
  const raw = await request.text().catch(() => '')
  if (!raw || raw.length > MAX_BODY_CHARS) return NextResponse.json({ ok: false }, { status: 400 })

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // 2) Honeypot: field "website" tidak pernah diisi manusia. Bot dibalas sukses palsu, tidak disimpan.
  if (typeof body === 'object' && body !== null && (body as { website?: unknown }).website) return ok()

  // 3) Validasi
  const parsed = leadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Data tidak valid' }, { status: 400 })

  // 4) Rate limit per IP (fail-open bila limiter bermasalah)
  const supabase = createAdminClient() // service role: tabel leads sengaja tanpa policy INSERT
  const wait = await checkRateLimit(supabase, 'leads', getClientIp(request), LIMIT.max, LIMIT.windowSec)
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: 'Terlalu banyak permintaan' },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    )
  }

  // 5) Simpan. Gagal menyimpan lead tidak boleh mengganggu pelanggan, jadi hanya dicatat di log.
  const { customer_name, total_estimate, payload } = parsed.data
  const { error } = await supabase.from('leads').insert({
    customer_name: customer_name || 'Tanpa nama',
    total_estimate,
    payload,
    status: 'new',
  })
  if (error) {
    console.error('[leads] insert gagal:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  after(() => notifyNewLead({ customer_name: customer_name || 'Tanpa nama', total_estimate, payload }).catch((e) => console.error('[leads] email gagal:', e)))
  return ok()
}

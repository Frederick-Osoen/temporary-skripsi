import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { after } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMIT = { max: 40, windowSec: 60 }
const GOOGLE_TIMEOUT_MS = 5000

const bodySchema = z.object({
  input: z
    .string({ error: 'Field "input" wajib berupa teks' })
    .trim()
    .min(3, 'Ketik minimal 3 huruf')
    .max(120, 'Maksimal 120 karakter'),
})

type GoogleResponse = {
  suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string } } }[]
}

async function handle(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Input tidak valid', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('[places] GOOGLE_MAPS_API_KEY belum diset')
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }

  try {
    const wait = await checkRateLimit(createAdminClient(), 'places', getClientIp(request), LIMIT.max, LIMIT.windowSec)
    if (wait > 0) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Coba lagi sebentar.', code: 'RATE_LIMITED', retry_after: wait },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      )
    }

    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
      },
      body: JSON.stringify({
        input: parsed.data.input,
        languageCode: 'id',
        regionCode: 'ID',
        includedRegionCodes: ['id'],
      }),
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
      cache: 'no-store',
    })

    if (!res.ok) {
      console.error('[places] Google error', res.status, await res.text())
      // fallback: UI tetap membolehkan mengetik alamat bebas
      return NextResponse.json({ error: 'Saran alamat tidak tersedia.', code: 'UPSTREAM_ERROR', fallback: true }, { status: 502 })
    }

    const data = (await res.json()) as GoogleResponse
    const suggestions = (data.suggestions ?? [])
      .map((s) => ({ place_id: s.placePrediction?.placeId ?? '', text: s.placePrediction?.text?.text ?? '' }))
      .filter((s) => s.place_id && s.text)
      .slice(0, 5)

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('[places] error:', err)
    return NextResponse.json({ error: 'Saran alamat tidak tersedia.', code: 'UPSTREAM_ERROR', fallback: true }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const started = Date.now()
  const res = await handle(request)
  const ms = Date.now() - started
  const source = request.headers.get('x-source') === 'public' ? 'public' : 'admin'
  // jumlah ketikan (>= 3 huruf) sejak permintaan sebelumnya: dasar hitungan "tanpa debounce"
  const events = Math.min(Math.max(parseInt(request.headers.get('x-input-events') ?? '', 10) || 0, 0), 500)

  if (res.status === 200 || res.status === 502) {
    after(async () => {
      try {
        await createAdminClient()
          .from('api_call_log')
          .insert({ endpoint: 'places', cache_hit: null, google_called: true, duration_ms: ms, input_events: events, source })
      } catch (err) {
        console.error('[places] gagal mencatat log:', err)
      }
    })
  }
  return res
}
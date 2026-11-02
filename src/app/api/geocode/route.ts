import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { ID_BOUNDS } from '@/lib/geo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Reverse geocoding: titik di peta -> alamat yang bisa dibaca. Kunci SERVER, tidak pernah dikirim ke browser.
// Klien memanggil ini hanya saat pin selesai digeser/diketuk (bukan selama menggeser).
const LIMIT = { max: 30, windowSec: 60 }
const GOOGLE_TIMEOUT_MS = 5000

const bodySchema = z.object({
  lat: z.number({ error: 'lat wajib angka' }).finite().min(ID_BOUNDS.latMin, 'Titik di luar Indonesia').max(ID_BOUNDS.latMax, 'Titik di luar Indonesia'),
  lng: z.number({ error: 'lng wajib angka' }).finite().min(ID_BOUNDS.lngMin, 'Titik di luar Indonesia').max(ID_BOUNDS.lngMax, 'Titik di luar Indonesia'),
})

type GeocodeResult = { formatted_address?: string; types?: string[] }

// Alamat paling berguna: lewati hasil "plus code" (mis. "C9X4+2M Pandaan") bila ada alternatif
function pickAddress(results: GeocodeResult[]) {
  const best = results.find((r) => r.formatted_address && !(r.types ?? []).includes('plus_code')) ?? results[0]
  const text = best?.formatted_address?.replace(/,\s*Indonesia$/i, '').trim()
  return text ? text.slice(0, 200) : null
}

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body harus berupa JSON' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Koordinat tidak valid', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.error('[geocode] GOOGLE_MAPS_API_KEY belum diset')
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }

  try {
    const wait = await checkRateLimit(createAdminClient(), 'geocode', getClientIp(request), LIMIT.max, LIMIT.windowSec)
    if (wait > 0) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Coba lagi sebentar.', code: 'RATE_LIMITED', retry_after: wait },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      )
    }

    const { lat, lng } = parsed.data
    const params = new URLSearchParams({ latlng: `${lat},${lng}`, language: 'id', region: 'id', key: apiKey })
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
      signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => null)) as { status?: string; results?: GeocodeResult[]; error_message?: string } | null

    if (!res.ok || !data) {
      console.error('[geocode] Google HTTP', res.status)
      return NextResponse.json({ error: 'Alamat tidak dapat dibaca.', code: 'UPSTREAM_ERROR' }, { status: 502 })
    }
    if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json({ address: null })
    }
    if (data.status !== 'OK') {
      // REQUEST_DENIED biasanya berarti Geocoding API belum diizinkan pada kunci server
      console.error('[geocode] Google status', data.status, data.error_message ?? '')
      return NextResponse.json({ error: 'Alamat tidak dapat dibaca.', code: 'UPSTREAM_ERROR' }, { status: 502 })
    }
    return NextResponse.json({ address: pickAddress(data.results ?? []) })
  } catch (err) {
    console.error('[geocode] error:', err)
    return NextResponse.json({ error: 'Alamat tidak dapat dibaca.', code: 'UPSTREAM_ERROR' }, { status: 502 })
  }
}

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
// import { Fuel } from 'lucide-react'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------------- Konfigurasi ----------------
const ZONE1_MAX_KM = 25
const ZONE2_MAX_KM = 75
const ROUND_TRIP = 2 // BBM dan tol selalu pulang-pergi

const TRUCK_TOLL_MULTIPLIER = Number(process.env.TRUCK_TOLL_MULTIPLIER ?? 1.5)
const TOLL_FALLBACK_PER_KM = Number(process.env.TOLL_FALLBACK_PER_KM ?? 0)
const TOLL_PASSES = (process.env.GOOGLE_TOLL_PASSES ?? 'ID_E_TOLL')
  .split(',').map((s) => s.trim()).filter(Boolean)

// PLACEHOLDER: kalibrasi dengan angka riil JJ Teknik
const FLEET = {
  // pickup: { label: 'Pickup', fuelRatePerKm: 1700, tollMultiplier: 1 },
  pickup: { label: 'Pickup', fuelRatePerKm: 1000, tollMultiplier: 1 },

  truck: { label:'Truck', fuelRatePerKm: 975, tollMultiplier: TRUCK_TOLL_MULTIPLIER },
  // truck: { label:'Truck', fuelRatePerKm: 3750, tollMultiplier: TRUCK_TOLL_MULTIPLIER },
} as const
type FleetType = keyof typeof FLEET

const LIMIT_ALL = { max: 20, windowSec: 60 }
const LIMIT_MISS = { max: 15, windowSec: 3600 }
const GOOGLE_TIMEOUT_MS = 8000
const GOOGLE_MAX_ATTEMPTS = 2
const DEBUG_TOLL = process.env.DEBUG_TOLL === '1'
// ---------------------------------------------

const bodySchema = z.object({
  destination: z
    .string({ error: 'Field "destination" wajib berupa teks' })
    .trim()
    .min(3, 'Alamat minimal 3 karakter')
    .max(200, 'Alamat maksimal 200 karakter'),
  fleet_type: z
    .enum(['pickup', 'truck'], { error: 'fleet_type harus "pickup" atau "truck"' })
    .default('pickup'),
})

type Money = { currencyCode?: string; units?: string; nanos?: number }
type TollInfo = { estimatedPrice?: Money[] }
type Route = {
  distanceMeters?: number
  travelAdvisory?: { tollInfo?: TollInfo }
  legs?: { travelAdvisory?: { tollInfo?: TollInfo } }[]
}

class RouteError extends Error {
  constructor(public kind: 'not_found' | 'upstream' | 'bad_request', message: string) {
    super(message)
  }
}

const normalizeKey = (d: string) => d.trim().toLowerCase().replace(/\s+/g, ' ')

function sumIDR(prices?: Money[]) {
  return (prices ?? [])
    .filter((p) => p.currencyCode === 'IDR')
    .reduce((s, p) => s + Number(p.units ?? 0) + (p.nanos ?? 0) / 1e9, 0)
}

function extractToll(route: Route) {
  const routeLevel = sumIDR(route.travelAdvisory?.tollInfo?.estimatedPrice)
  if (routeLevel > 0) return routeLevel
  return (route.legs ?? []).reduce(
    (s, l) => s + sumIDR(l.travelAdvisory?.tollInfo?.estimatedPrice), 0
  )
}

async function callGoogle(destination: string, withPasses: boolean) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  const origin = process.env.WAREHOUSE_ADDRESS
  if (!apiKey || !origin) throw new Error('GOOGLE_MAPS_API_KEY / WAREHOUSE_ADDRESS belum diset')

  const routeModifiers: Record<string, unknown> = {
    avoidTolls: false,
    vehicleInfo: { emissionType: 'GASOLINE' },
  }
  // Kunci utama untuk Indonesia: tanpa tollPasses, harga tol tidak dikembalikan
  if (withPasses && TOLL_PASSES.length) routeModifiers.tollPasses = TOLL_PASSES

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'routes.distanceMeters',
        'routes.travelAdvisory.tollInfo',
        'routes.legs.travelAdvisory.tollInfo',
      ].join(','),
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      extraComputations: ['TOLLS'],
      routeModifiers,
      regionCode: 'ID',
      languageCode: 'id',
      units: 'METRIC',
    }),
    signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
    cache: 'no-store',
  })

  if (res.status === 404) throw new RouteError('not_found', 'Alamat tidak ditemukan')
  if (res.status === 429 || res.status >= 500) throw new Error(`Google Routes API ${res.status}`)
  if (res.status === 400) {
    console.error('[distance] Google 400:', await res.text())
    throw new RouteError('bad_request', 'Payload ditolak Google')
  }
  if (!res.ok) {
    console.error('[distance] Google error', res.status, await res.text())
    throw new RouteError('upstream', `Google Routes API ${res.status}`)
  }

  const route = ((await res.json()) as { routes?: Route[] }).routes?.[0]
  if (!route || typeof route.distanceMeters !== 'number') {
    throw new RouteError('not_found', 'Rute tidak ditemukan')
  }

  if (DEBUG_TOLL) {
    console.log('[distance][DEBUG_TOLL]', JSON.stringify({
      withPasses,
      distanceMeters: route.distanceMeters,
      routeTollInfo: route.travelAdvisory?.tollInfo ?? null,
      legTollInfo: route.legs?.map((l) => l.travelAdvisory?.tollInfo ?? null),
    }))
  }

  return {
    distanceKm: Math.round((route.distanceMeters / 1000) * 100) / 100,
    tollOneWay: Math.round(extractToll(route)), // Gol I, satu arah
  }
}

async function fetchGoogleRoute(destination: string) {
  let lastError: unknown
  let withPasses = true

  for (let attempt = 1; attempt <= GOOGLE_MAX_ATTEMPTS + 1; attempt++) {
    try {
      return await callGoogle(destination, withPasses)
    } catch (err) {
      if (err instanceof RouteError && err.kind === 'bad_request' && withPasses) {
        // Kemungkinan nama tollPass salah: coba tanpa kartu tol agar jarak tetap dapat
        console.error('[distance] ulangi tanpa tollPasses, cek GOOGLE_TOLL_PASSES')
        withPasses = false
        continue
      }
      if (err instanceof RouteError) throw err
      lastError = err
      console.error(`[distance] percobaan ${attempt} gagal:`, err)
    }
  }
  throw new RouteError('upstream', lastError instanceof Error ? lastError.message : 'Gagal menghubungi Google')
}

type TollSource = 'google' | 'estimated' | 'unavailable' | 'not_applicable'

// Fallback bertingkat: harga Google -> estimasi per km -> flag review
function resolveToll(tollOneWayRaw: number, distanceKm: number): { oneWay: number; source: TollSource } {
  if (tollOneWayRaw > 0) return { oneWay: tollOneWayRaw, source: 'google' }
  if (TOLL_FALLBACK_PER_KM > 0) {
    return { oneWay: Math.round(distanceKm * TOLL_FALLBACK_PER_KM), source: 'estimated' }
  }
  return { oneWay: 0, source: 'unavailable' }
}

function calculate(distanceKm: number, tollOneWayRaw: number, fleet: FleetType) {
  const cfg = FLEET[fleet]

  // zona 1 = Gratis
  if (distanceKm <= ZONE1_MAX_KM) {
    return { 
      zone: 1, 
      fuel_fee: 0, 
      toll_one_way_car:0,
      toll_car_fee:0,
      toll_truck_fee:0,
      toll_fee: 0,
      shipping_fee: 0 as number | null, 
      toll_source: 'not_applicable' as TollSource,       
      }
  }

  const toll = resolveToll(tollOneWayRaw, distanceKm)

  // Tol pulang-pergi untuk masing-masing fleet (Truck = satu arah Gol 1 x 1.5 x 2)
  const tollCarFee = Math.round(toll.oneWay * FLEET.pickup.tollMultiplier * ROUND_TRIP)
  const tollTruckFee = Math.round(toll.oneWay * FLEET.truck.tollMultiplier * ROUND_TRIP)
  // Tol yang dipakai untuk armada yang dipilih
  const tollFee = fleet === 'truck' ? tollTruckFee : tollCarFee

  const common = {
    toll_one_way_car: toll.oneWay,
    toll_car_fee: tollCarFee,
    toll_truck_fee: tollTruckFee,
    toll_fee: tollFee,
    toll_source: toll.source,
  }

  // Ongkir Zona 2
  if (distanceKm <= ZONE2_MAX_KM){
    const fuel = Math.round(distanceKm * ROUND_TRIP * cfg.fuelRatePerKm)
    return{
      zone: 2,
      fuel_fee: fuel,
      shipping_fee: fuel + tollFee,
      ...common
    }
  } 

  const fuel = Math.round(distanceKm * ROUND_TRIP * cfg.fuelRatePerKm)
  return{
    zone: 3,
    fuel_fee: fuel,
    shipping_fee: fuel + tollFee,
    ...common
  }
}

function buildResponse(distanceKm: number, tollOneWayRaw: number, fleet: FleetType, cached: boolean) {
  const r = calculate(distanceKm, tollOneWayRaw, fleet)
  const cfg = FLEET[fleet]

  return NextResponse.json({
    // Armada yang dipakai
    distance_km: distanceKm,
    fleet_type: fleet,
    fleet_label: cfg.label,
    zone: r.zone,

    // rincian BBM
    round_trip_km: Math.round(distanceKm * ROUND_TRIP * 100) / 100,
    fuel_rate_per_km: cfg.fuelRatePerKm,
    fuel_fee: r.fuel_fee,

    // Rincian tol
    toll_one_way_car: r.toll_one_way_car, // Harga normal 1 arah
    toll_multiplier: cfg.tollMultiplier,
    toll_car_fee: r.toll_car_fee,
    toll_truck_fee: r.toll_truck_fee,
    toll_fee: r.toll_fee, // pulang-pergi, sudah termasuk golongan armada
    toll_source: r.toll_source,
    toll_needs_review: r.zone >= 2 && r.toll_source !== 'google',

    shipping_fee: r.zone === 3 ? null : r.shipping_fee,    // = fuel_fee + toll_fee
    suggested_shipping_fee: r.zone === 3 ? r.shipping_fee : null, // Referensi admin untuk luar kota

    requires_manual_price: r.zone === 3,

    cached,
  })
}

const tooMany = (retryAfter: number) =>
  NextResponse.json(
    { error: 'Terlalu banyak permintaan. Coba lagi sebentar.', code: 'RATE_LIMITED', retry_after: retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )

export async function POST(request: Request) {
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
  const { destination, fleet_type } = parsed.data

  try {
    const supabase = createAdminClient()
    const ip = getClientIp(request)

    const wait = await checkRateLimit(supabase, 'distance', ip, LIMIT_ALL.max, LIMIT_ALL.windowSec)
    if (wait > 0) return tooMany(wait)

    const key = normalizeKey(destination)
    const { data: cached, error: cacheError } = await supabase
      .from('route_cache')
      .select('distance_km, toll_fee')
      .eq('destination_key', key)
      .maybeSingle()

    if (cacheError) console.error('[distance] gagal baca cache:', cacheError)
    else if (cached) {
      return buildResponse(Number(cached.distance_km), Number(cached.toll_fee ?? 0), fleet_type, true)
    }

    const waitMiss = await checkRateLimit(supabase, 'distance-miss', ip, LIMIT_MISS.max, LIMIT_MISS.windowSec)
    if (waitMiss > 0) return tooMany(waitMiss)

    const { distanceKm, tollOneWay } = await fetchGoogleRoute(destination)

    // Cache: jarak + tol satu arah Gol I (tidak tergantung armada)
    const { error: upsertError } = await supabase
      .from('route_cache')
      .upsert({ destination_key: key, distance_km: distanceKm, toll_fee: tollOneWay }, { onConflict: 'destination_key' })
    if (upsertError) console.error('[distance] gagal simpan cache:', upsertError)

    return buildResponse(distanceKm, tollOneWay, fleet_type, false)
  } catch (err) {
    if (err instanceof RouteError && err.kind === 'not_found') {
      return NextResponse.json(
        { error: 'Alamat tidak ditemukan. Coba tulis lebih lengkap.', code: 'ADDRESS_NOT_FOUND' },
        { status: 404 }
      )
    }
    if (err instanceof RouteError) {
      return NextResponse.json(
        { error: 'Layanan peta sedang bermasalah.', code: 'UPSTREAM_ERROR', fallback: true },
        { status: 502 }
      )
    }
    console.error('[distance] error tak terduga:', err)
    return NextResponse.json({ error: 'Kesalahan server' }, { status: 500 })
  }
}
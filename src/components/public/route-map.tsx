'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, LocateFixed, MapPin, PencilLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { loadGoogleMaps, onMapsAuthFailure } from '@/lib/public/google-maps'
import { PANDAAN_VIEW, decodePolyline, formatCoord, inIndonesia, type LatLng } from '@/lib/geo'
import { cn } from '@/lib/utils'

// Map ID dibutuhkan marker modern (AdvancedMarkerElement). DEMO_MAP_ID hanya untuk pengembangan:
// buat Map ID sendiri di Google Cloud Console lalu isi NEXT_PUBLIC_GOOGLE_MAP_ID.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID'

const COLOR = { navy: '#0b1b33', volt: '#f59e0b', voltDark: '#b45309', route: '#0e7490' }

type Props = {
  /** 'pick' = pelanggan menaruh/mengoreksi pin; 'route' = menampilkan rute hasil hitungan */
  mode: 'pick' | 'route'
  /** Garis rute dari /api/distance (encoded polyline) */
  polyline: string | null
  /** Titik tujuan yang sudah dipakai menghitung ongkir (atau titik awal saat membuka pinpoint) */
  point: LatLng | null
  /** Ongkir sedang dihitung ulang */
  busy?: boolean
  onConfirm: (p: LatLng, address: string | null) => void
  onStartPick: () => void
  onCancelPick: () => void
}

type Objects = {
  map: google.maps.Map
  dest: google.maps.marker.AdvancedMarkerElement
  origin: google.maps.marker.AdvancedMarkerElement
  line: google.maps.Polyline
  accuracy: google.maps.Circle
}

type AddrState = { status: 'idle' | 'loading' | 'ok' | 'error'; text: string | null; note?: string }
type GeoState = { status: 'idle' | 'loading' | 'ok' | 'error'; note?: string; accuracy?: number }

const toLiteral = (
  p: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | google.maps.LatLngAltitudeLiteral | null | undefined
): LatLng | null => {
  if (!p) return null
  return typeof p.lat === 'function'
    ? { lat: (p as google.maps.LatLng).lat(), lng: (p as google.maps.LatLng).lng() }
    : { lat: p.lat as number, lng: p.lng as number }
}

export function RouteMap({ mode, polyline, point, busy = false, onConfirm, onStartPick, onCancelPick }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const objs = useRef<Objects | null>(null)
  const modeRef = useRef(mode)
  const initialPoint = useRef(point)
  const moveRef = useRef<(p: LatLng, opts?: { pan?: boolean; fromGps?: boolean }) => void>(() => {})
  const lookupSeq = useRef(0)

  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [slow, setSlow] = useState(false) // skeleton hanya bila memuat > 300 ms
  const [draft, setDraft] = useState<LatLng | null>(point)
  const [dirty, setDirty] = useState(false) // pin sudah dipindah sejak mode koreksi dibuka
  const [addr, setAddr] = useState<AddrState>({ status: 'idle', text: null })
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })

  // ---------- alamat dari titik (server, kunci server) ----------
  async function lookup(p: LatLng) {
    const id = ++lookupSeq.current
    setAddr({ status: 'loading', text: null })
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: p.lat, lng: p.lng }),
      })
      const json = (await res.json().catch(() => null)) as { address?: string | null; error?: string } | null
      if (id !== lookupSeq.current) return
      if (res.ok) {
        setAddr(json?.address ? { status: 'ok', text: json.address } : { status: 'error', text: null, note: 'Alamat jalan tidak terbaca di titik ini.' })
      } else {
        setAddr({ status: 'error', text: null, note: res.status === 429 ? 'Terlalu sering. Tunggu sebentar lalu geser lagi.' : json?.error })
      }
    } catch {
      if (id === lookupSeq.current) setAddr({ status: 'error', text: null })
    }
  }

  function moveTo(p: LatLng, opts: { pan?: boolean; fromGps?: boolean } = {}) {
    setDraft(p)
    setDirty(true)
    const o = objs.current
    if (o) {
      if (opts.pan) {
        o.map.panTo(p)
        if ((o.map.getZoom() ?? 0) < 16) o.map.setZoom(17)
      }
      if (!opts.fromGps) o.accuracy.setMap(null) // pin dikoreksi manual: lingkaran akurasi GPS tidak relevan lagi
    }
    if (!opts.fromGps) setGeo((g) => (g.status === 'ok' ? { status: 'idle' } : g))
    if (inIndonesia(p)) void lookup(p)
    else setAddr({ status: 'error', text: null, note: 'Titik berada di luar jangkauan layanan.' })
  }

  useEffect(() => {
    moveRef.current = moveTo
    modeRef.current = mode
  })

  // ---------- muat Google Maps sekali per komponen ----------
  useEffect(() => {
    let cancelled = false
    const slowTimer = setTimeout(() => setSlow(true), 300)
    const offAuth = onMapsAuthFailure(() => setState('error'))
    const listeners: google.maps.MapsEventListener[] = []

    void (async () => {
      try {
        await loadGoogleMaps()
        const [{ Map, Polyline, Circle }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
          google.maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
        ])
        if (cancelled || !box.current) return

        const start = initialPoint.current
        const map = new Map(box.current, {
          center: start ?? PANDAAN_VIEW,
          zoom: start ? 16 : 11,
          mapId: MAP_ID,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          clickableIcons: false,
          gestureHandling: 'cooperative',
        })
        const destPin = new PinElement({ background: COLOR.volt, borderColor: COLOR.voltDark, glyphColor: COLOR.navy, scale: 1.15 })
        const originPin = new PinElement({ background: COLOR.navy, borderColor: COLOR.navy, glyphColor: '#ffffff', scale: 0.9 })
        const dest = new AdvancedMarkerElement({ title: 'Titik tujuan', content: destPin.element })
        const origin = new AdvancedMarkerElement({ title: 'Gudang JJ Teknik, Pandaan', content: originPin.element })
        const line = new Polyline({ strokeColor: COLOR.route, strokeOpacity: 0.9, strokeWeight: 5 })
        const accuracy = new Circle({ strokeColor: COLOR.route, strokeOpacity: 0.5, strokeWeight: 1, fillColor: COLOR.route, fillOpacity: 0.12, clickable: false })

        // Ketuk peta = pindahkan pin (cara utama di HP); geser pin = koreksi halus
        listeners.push(
          map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (modeRef.current !== 'pick' || !e.latLng) return
            moveRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() })
          }),
          dest.addListener('dragend', () => {
            const p = toLiteral(dest.position)
            if (p && modeRef.current === 'pick') moveRef.current(p)
          })
        )

        objs.current = { map, dest, origin, line, accuracy }
        setState('ready')
      } catch (err) {
        console.error('[maps]', err)
        if (!cancelled) setState('error')
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(slowTimer)
      offAuth()
      listeners.forEach((l) => l.remove())
      const o = objs.current
      if (o) {
        o.dest.map = null
        o.origin.map = null
        o.line.setMap(null)
        o.accuracy.setMap(null)
      }
      objs.current = null
    }
  }, [])

  // ---------- gambar sesuai mode ----------
  useEffect(() => {
    const o = objs.current
    if (state !== 'ready' || !o) return
    const { map, dest, origin, line, accuracy } = o

    if (mode === 'pick') {
      // Satu jari menggeser peta saat memilih titik; di mode rute halaman tetap mudah di-scroll
      map.setOptions({ gestureHandling: 'greedy' })
      line.setMap(null)
      origin.map = null
      dest.gmpDraggable = true
      dest.position = draft
      dest.map = draft ? map : null
      return
    }

    map.setOptions({ gestureHandling: 'cooperative' })
    accuracy.setMap(null)
    dest.gmpDraggable = false
    const path = polyline ? decodePolyline(polyline) : []
    const end = point ?? path.at(-1) ?? null
    line.setPath(path)
    line.setMap(path.length > 1 ? map : null)
    origin.position = path[0] ?? null
    origin.map = path.length > 1 ? map : null
    dest.position = end
    dest.map = end ? map : null

    if (path.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      path.forEach((p) => bounds.extend(p))
      if (end) bounds.extend(end)
      map.fitBounds(bounds, 40)
    } else if (end) {
      map.setCenter(end)
      map.setZoom(15)
    }
  }, [state, mode, polyline, point, draft])

  // ---------- aksi ----------
  function startPick() {
    const current = point ?? (polyline ? decodePolyline(polyline).at(-1) ?? null : null)
    setDraft(current)
    setDirty(false)
    setAddr({ status: 'idle', text: null })
    setGeo({ status: 'idle' })
    onStartPick()
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'error', note: 'Perangkat ini tidak mendukung lokasi. Ketuk peta untuk menaruh pin.' })
      return
    }
    setGeo({ status: 'loading' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const accuracy = Math.round(pos.coords.accuracy)
        setGeo({ status: 'ok', accuracy })
        moveRef.current(p, { pan: true, fromGps: true })
        const o = objs.current
        if (o) {
          o.accuracy.setCenter(p)
          o.accuracy.setRadius(accuracy)
          o.accuracy.setMap(o.map)
        }
      },
      (err) => {
        setGeo({
          status: 'error',
          note: err.code === err.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Ketuk peta untuk menaruh pin secara manual.'
            : 'Lokasi belum didapat. Coba lagi di tempat terbuka, atau ketuk peta.',
        })
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    )
  }

  const canConfirm = mode === 'pick' && !!draft && dirty && inIndonesia(draft) && addr.status !== 'loading'

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="relative">
        <div
          ref={box}
          role="region"
          aria-label={mode === 'pick' ? 'Peta untuk memilih titik tujuan' : 'Peta rute pengiriman dari Pandaan'}
          className={cn('h-64 w-full bg-muted sm:h-80', state === 'loading' && slow && 'skeleton rounded-none')}
        />
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted px-6 text-center">
            <MapPin className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Peta tidak dapat dimuat. Anda tetap bisa memakai alamat yang diketik.</p>
          </div>
        )}
        {mode === 'route' && busy && state !== 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]" role="status">
            <span className="rounded-full bg-background px-3 py-1.5 text-xs font-medium shadow-sm">Menghitung rute...</span>
          </div>
        )}
        {mode === 'pick' && state === 'ready' && !draft && (
          <p className="pointer-events-none absolute inset-x-3 top-3 rounded-lg bg-background/95 px-3 py-2 text-center text-xs shadow-sm">
            Ketuk peta untuk menaruh pin tujuan
          </p>
        )}
      </div>

      {mode === 'route' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3.5 py-3">
          <p className="text-xs text-muted-foreground">
            <span className="mr-1.5 inline-block size-2 rounded-full bg-[#0e7490] align-middle" aria-hidden="true" />
            Rute dari gudang JJ Teknik, Pandaan
          </p>
          {state !== 'error' && (
            <Button type="button" variant="ghost" size="sm" onClick={startPick} disabled={busy}>
              <PencilLine data-icon="inline-start" aria-hidden="true" /> Titik kurang tepat? Koreksi
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 border-t px-3.5 py-3">
          <p className="text-xs text-muted-foreground">
            Ketuk peta atau geser pin oranye ke lokasi acara. GPS HP bisa meleset puluhan meter, jadi periksa lagi sebelum dipakai.
          </p>

          <div className="min-h-10 rounded-lg bg-muted/50 px-3 py-2 text-sm" aria-live="polite">
            {!draft && <span className="text-muted-foreground">Belum ada titik dipilih.</span>}
            {draft && addr.status === 'loading' && <span className="skeleton block h-4 w-4/5" aria-label="Membaca alamat" />}
            {draft && addr.status === 'ok' && <span className="break-words">{addr.text}</span>}
            {draft && (addr.status === 'error' || addr.status === 'idle') && (
              <span className="text-muted-foreground">
                {addr.status === 'error' ? `${addr.note ?? 'Alamat tidak terbaca.'} ` : ''}
                Titik: <span className="num">{formatCoord(draft)}</span>
              </span>
            )}
          </div>

          {geo.status === 'ok' && geo.accuracy !== undefined && (
            <p className={cn('text-xs', geo.accuracy > 50 ? 'text-warning' : 'text-muted-foreground')}>
              Akurasi GPS ± {geo.accuracy} m{geo.accuracy > 50 ? '. Lingkaran di peta menunjukkan area perkiraan; geser pin ke titik yang benar.' : '.'}
            </p>
          )}
          {geo.status === 'error' && <p className="text-xs text-warning">{geo.note}</p>}

          <div className="flex flex-wrap items-center gap-2">
            {/* Aksi utama paling atas & selebar layar di HP; di layar lebar pindah ke kanan */}
            <Button
              type="button"
              variant="accent"
              className="h-10 w-full sm:order-last sm:ml-auto sm:w-auto"
              disabled={!canConfirm}
              onClick={() => draft && onConfirm(draft, addr.status === 'ok' ? addr.text : null)}
            >
              <Check data-icon="inline-start" aria-hidden="true" /> Pakai titik ini
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={locate} disabled={state !== 'ready' || geo.status === 'loading'}>
              <LocateFixed data-icon="inline-start" aria-hidden="true" />
              {geo.status === 'loading' ? 'Mencari lokasi...' : 'Gunakan lokasi saya'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancelPick}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

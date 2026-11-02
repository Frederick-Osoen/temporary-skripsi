// Utilitas koordinat yang dipakai server dan klien (tanpa dependensi, aman di bundle publik).

export type LatLng = { lat: number; lng: number }

// Kotak kasar wilayah Indonesia: menolak koordinat ngawur/penyalahgunaan sebelum memanggil Google.
export const ID_BOUNDS = { latMin: -11.5, latMax: 6.5, lngMin: 94.5, lngMax: 141.5 } as const

export const inIndonesia = (p: LatLng) =>
  Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
  p.lat >= ID_BOUNDS.latMin && p.lat <= ID_BOUNDS.latMax &&
  p.lng >= ID_BOUNDS.lngMin && p.lng <= ID_BOUNDS.lngMax

// Pusat tampilan awal peta (sekitar Pandaan). Hanya untuk kamera, bukan untuk hitungan jarak:
// jarak selalu dihitung server dari WAREHOUSE_ADDRESS.
export const PANDAAN_VIEW: LatLng = { lat: -7.65, lng: 112.69 }

// 3 desimal ~ 110 m: titik yang berdekatan berbagi satu entri cache rute.
export const roundCoord = (n: number) => Math.round(n * 1000) / 1000

export const coordKey = (p: LatLng) => `ll:${roundCoord(p.lat).toFixed(3)},${roundCoord(p.lng).toFixed(3)}`

export const mapsLink = (p: LatLng) => `https://www.google.com/maps?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`

export const formatCoord = (p: LatLng) => `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`

// Dekoder "encoded polyline" Google (presisi 1e5). Ditulis sendiri supaya tidak perlu memuat pustaka geometry.
export function decodePolyline(encoded: string): LatLng[] {
  const out: LatLng[] = []
  if (!encoded || encoded.length > 200_000) return out
  let index = 0
  let lat = 0
  let lng = 0
  const next = () => {
    let result = 0
    let shift = 0
    let b: number
    do {
      if (index >= encoded.length) return null
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    return result & 1 ? ~(result >> 1) : result >> 1
  }
  while (index < encoded.length) {
    const dLat = next()
    const dLng = next()
    if (dLat === null || dLng === null) break // string rusak: kembalikan yang sudah terbaca
    lat += dLat
    lng += dLng
    out.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }
  return out
}

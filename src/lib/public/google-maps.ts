'use client'

// Pemuat Google Maps JavaScript API. Skrip baru diunduh saat peta benar-benar dibutuhkan
// (pelanggan membuka pinpoint atau rute sudah terhitung), jadi halaman estimasi tetap ringan.
// Memakai KUNCI BROWSER (NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY) yang dibatasi referrer jjteknik.id
// dan hanya mengizinkan Maps JavaScript API. Kunci server tidak pernah dipakai di sini.

let loading: Promise<void> | null = null
const authListeners = new Set<() => void>()
let authFailed = false

type MapsWindow = Window & {
  google?: { maps?: { importLibrary?: unknown } }
  __jjMapsReady?: () => void
  gm_authFailure?: () => void
}

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Hanya di browser'))
  const w = window as MapsWindow
  if (authFailed) return Promise.reject(new Error('Kunci Google Maps ditolak'))
  if (w.google?.maps?.importLibrary) return Promise.resolve()
  if (loading) return loading

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY
  if (!key) return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY belum diset'))

  // Google memanggil fungsi global ini bila kunci/referrer ditolak (peta tampil abu-abu "Oops")
  w.gm_authFailure = () => {
    authFailed = true
    console.error('[maps] kunci browser ditolak: cek referrer dan API restriction di Google Cloud Console')
    authListeners.forEach((fn) => fn())
  }

  loading = new Promise<void>((resolve, reject) => {
    w.__jjMapsReady = () => resolve()
    const params = new URLSearchParams({
      key,
      v: 'weekly',
      loading: 'async',
      callback: '__jjMapsReady',
      language: 'id',
      region: 'ID',
    })
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`
    script.async = true
    script.onerror = () => {
      loading = null // boleh dicoba lagi (mis. koneksi sempat putus)
      script.remove()
      reject(new Error('Gagal memuat Google Maps'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export function onMapsAuthFailure(fn: () => void) {
  if (authFailed) fn()
  authListeners.add(fn)
  return () => {
    authListeners.delete(fn)
  }
}

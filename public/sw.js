// Service worker JJ Teknik. Sengaja kecil dan hati-hati:
// - TIDAK menyimpan halaman dashboard, API, atau data apa pun (semua butuh login dan harus selalu segar).
// - Hanya menyimpan aset statis (JS/CSS/font/ikon) agar aplikasi cepat terbuka,
//   dan menyediakan halaman offline saat tidak ada jaringan.
const VERSION = 'jj-v1'
const OFFLINE_URL = '/offline.html'
const STATIC_PREFIXES = ['/_next/static/', '/icons/', '/brand/']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req)
        const net = fetch(req)
          .then((res) => { if (res.ok) cache.put(req, res.clone()); return res })
          .catch(() => hit)
        return hit || net
      })
    )
  }
})

'use client'

import { useEffect } from 'react'

// Daftarkan service worker hanya di produksi (di dev, cache mengganggu hot reload).
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => console.error('[pwa] gagal mendaftar:', err))
  }, [])
  return null
}

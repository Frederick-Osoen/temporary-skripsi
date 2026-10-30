'use client'

import { useEffect } from 'react'

// Service worker hanya hidup di produksi. Di dev, justru dibersihkan: service worker sisa
// `npm start` di localhost yang sama akan menyajikan CSS/JS lama (cache-first) dan membuat
// tampilan tidak sesuai kode terbaru.
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {})
      if ('caches' in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
      return
    }
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => console.error('[pwa] gagal mendaftar:', err))
  }, [])
  return null
}

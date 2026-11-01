'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Memuat ulang data halaman server secara berkala selama tab terlihat, dan saat tab kembali dibuka.
// Dipakai di halaman yang perlu "hidup" (mis. Leads). Status isian/filter di klien tetap terjaga.
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh() }
    refresh() // halaman bisa datang dari cache peramban (staleTimes), jadi segarkan sekali saat dibuka
    const timer = setInterval(refresh, seconds * 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [router, seconds])
  return null
}

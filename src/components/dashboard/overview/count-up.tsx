'use client'

import { useEffect, useRef, useState } from 'react'
import { formatRupiah } from '@/lib/orders/utils'

// Angka menghitung naik SEKALI saat halaman dibuka (400 ms: dashboard dibuka puluhan kali sehari, jadi singkat).
// Render server = nilai akhir (aman tanpa JS). Perubahan nilai berikutnya (mis. refresh otomatis) langsung tampil.
// Animasi dilewati bila reduced-motion.
export function CountUp({ value, format = 'number', duration = 400 }: { value: number; format?: 'number' | 'rupiah'; duration?: number }) {
  const [shown, setShown] = useState(value)
  const first = useRef(true)

  useEffect(() => {
    const isFirst = first.current
    first.current = false
    if (!isFirst || value === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  const text = format === 'rupiah'
    ? formatRupiah(shown)
    : new Intl.NumberFormat('id-ID').format(shown)
  return <span className="tabular-nums">{text}</span>
}

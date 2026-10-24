'use client'

import { useEffect, useRef, useState } from 'react'
import { formatRupiah } from '@/lib/orders/utils'

// Angka yang menghitung naik sekali saat halaman dibuka.
// Render server = nilai akhir (aman tanpa JS); animasi dilewati bila reduced-motion.
export function CountUp({ value, format = 'number', duration = 900 }: { value: number; format?: 'number' | 'rupiah'; duration?: number }) {
  const [shown, setShown] = useState(value)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (value === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
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

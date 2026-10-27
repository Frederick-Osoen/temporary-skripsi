'use client'

import { useEffect, useRef } from 'react'

// Menahan animasi CSS anak-anaknya sampai elemen masuk layar (sekali saja).
// Tanpa JS: animasi langsung berjalan seperti biasa. Bila sudah terlihat saat dimuat, observer langsung melepasnya.
export function PlayWhenVisible({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    el.dataset.play = 'wait'
    // Ulang dari awal agar penonton melihat seluruh urutannya
    el.getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = 0 })
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        delete el.dataset.play
        el.getAnimations({ subtree: true }).forEach((a) => a.play())
        io.disconnect()
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

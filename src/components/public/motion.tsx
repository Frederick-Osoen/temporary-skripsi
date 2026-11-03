'use client'

import { LazyMotion, MotionConfig, m } from 'framer-motion'

// Fitur animasi diunduh TERPISAH dan baru saat browser idle (bukan saat halaman dimuat), jadi tidak
// bersaing dengan konten pertama. Dipakai bersama oleh semua FadeIn lewat satu promise.
// Selama fitur belum datang, konten di bawah lipatan layar menunggu dan muncul begitu siap.
let featuresPromise: ReturnType<typeof importFeatures> | null = null

function importFeatures() {
  return import('framer-motion').then((mod) => mod.domAnimation)
}

function loadFeatures() {
  featuresPromise ??= new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => resolve(), { timeout: 1500 })
    else setTimeout(resolve, 300)
  }).then(importFeatures)
  return featuresPromise
}

// Hanya untuk bagian DI BAWAH lipatan layar, hanya sekali tampil, dan hanya opacity + transform
// (dua properti yang dianimasikan GPU, tanpa memicu layout ulang).
// LazyMotion ada DI SINI (bukan di layout): halaman tanpa FadeIn tidak membayar apa pun.
// reducedMotion="user": pengguna yang mematikan animasi di perangkatnya tidak melihat gerak transform.
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <m.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px 0px -8% 0px' }}
          transition={{ duration: 0.45, delay, ease: [0.23, 1, 0.32, 1] }}
          className={className}
        >
          {children}
        </m.div>
      </MotionConfig>
    </LazyMotion>
  )
}

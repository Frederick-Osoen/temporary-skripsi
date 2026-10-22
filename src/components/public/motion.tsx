'use client'

import { LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion'

// LazyMotion: hanya fitur animasi dasar yang dimuat (bundel kecil)
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

// Hanya untuk bagian DI BAWAH lipatan layar, dan hanya sekali tampil
export function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </m.div>
  )
}
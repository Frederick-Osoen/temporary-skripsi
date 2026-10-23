'use client'

import { useEffect, useRef, useState } from 'react'

/** Stempel garansi: "menekan" sekali saat pertama kali terlihat. */
export function GuaranteeStamp() {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const ring = 'TIDAK DINGIN • TIDAK BAYAR • JJ TEKNIK • PANDAAN •'
  return (
    <div ref={ref} className="relative mx-auto size-56 sm:size-64" aria-hidden="true">
      <svg viewBox="0 0 200 200" className={seen ? 'stamp-in size-full' : 'size-full opacity-0'}>
        <defs>
          <path id="stamp-ring" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0" />
        </defs>
        <circle cx="100" cy="100" r="94" fill="none" stroke="var(--garansi)" strokeWidth="3" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="var(--garansi)" strokeWidth="2" />
        <text fill="var(--garansi)" fontSize="13.5" fontWeight="700" letterSpacing="2.2" style={{ fontFamily: 'var(--font-heading)' }}>
          <textPath href="#stamp-ring" textLength="462" lengthAdjust="spacing">{ring}</textPath>
        </text>
        <text x="100" y="98" textAnchor="middle" fill="var(--garansi)" fontSize="19" fontWeight="700" style={{ fontFamily: 'var(--font-heading)' }}>
          GARANSI
        </text>
        <text x="100" y="121" textAnchor="middle" fill="var(--garansi)" fontSize="15" fontWeight="600" style={{ fontFamily: 'var(--font-heading)' }}>
          DINGIN
        </text>
      </svg>
    </div>
  )
}

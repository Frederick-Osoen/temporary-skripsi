'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Adegan hero "Malam Acara, Arus Dingin".
 * Tenda acara digambar dengan SVG (tajam, ringan). Udara di dalamnya adalah partikel di <canvas>.
 * Urutan sekali saat dibuka: genset menyala -> lampu tenda hidup -> AC menyala -> udara amber jadi cyan,
 * suhu 34° turun ke 22°. Kursor/sentuhan menambah panas; AC melawannya dan angka suhu ikut bereaksi.
 *
 * Performa: tanpa library. Partikel 220 (HP) / 420 (desktop), berhenti saat keluar layar / tab tersembunyi,
 * dimulai setelah browser idle. prefers-reduced-motion: langsung tampil keadaan akhir, tanpa loop.
 */

const VW = 600
const VH = 420
const FLOOR = 372
const LEFT = 84
const RIGHT = 516
const roofY = (x: number) => 70 + Math.abs(x - 300) * (100 / 230)

type Phase = 'hot' | 'power' | 'cool'

const BULBS = Array.from({ length: 13 }, (_, i) => {
  const t = i / 12
  const x = 92 + t * 416
  const y = 188 + Math.sin(t * Math.PI) * 34
  return { x, y }
})

// Emitor AC: posisi kisi udara dan arah tiupan
const EMITTERS = [
  { x: 132, y: 304, dir: 1 },
  { x: 468, y: 304, dir: -1 },
]

type P = { x: number; y: number; vx: number; vy: number; t: number; r: number }

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function spawn(n: number, hot: number): P[] {
  return Array.from({ length: n }, () => {
    const x = LEFT + 6 + Math.random() * (RIGHT - LEFT - 12)
    const top = roofY(x) + 10
    return {
      x,
      y: top + Math.random() * (FLOOR - top - 6),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      t: hot,
      r: 1.1 + Math.random() * 1.3,
    }
  })
}

export function TentScene({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tempRef = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<Phase>('hot')

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const css = getComputedStyle(wrap)
    const hot = hexToRgb(css.getPropertyValue('--volt') || '#ffb547')
    const cold = hexToRgb(css.getPropertyValue('--frost') || '#5ee7f7')
    const LUT = Array.from({ length: 32 }, (_, i) => {
      const k = i / 31 // 0 = dingin, 1 = panas
      const c = cold.map((v, j) => Math.round(v + (hot[j] - v) * k))
      return `rgba(${c[0]},${c[1]},${c[2]},0.9)`
    })

    let scale = 1
    let dpr = 1
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 1.75)
      scale = rect.width / VW
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.width * (VH / VW) * dpr)
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    }
    resize()

    const count = wrap.getBoundingClientRect().width < 520 ? 160 : 380
    const ps = spawn(count, reduced ? 0.08 : 1)

    // Goresan dikelompokkan per warna + ketebalan: ±40 panggilan stroke per frame, bukan satu per partikel.
    const WIDTHS = [1.3, 1.8, 2.4]
    const buckets: number[][] = Array.from({ length: 32 * WIDTHS.length }, () => [])
    const draw = () => {
      ctx.clearRect(0, 0, VW, VH)
      ctx.lineCap = 'round'
      for (const b of buckets) b.length = 0
      for (const p of ps) {
        const speed = Math.hypot(p.vx, p.vy)
        const ci = Math.max(0, Math.min(31, Math.round(p.t * 31)))
        const wi = p.r < 1.7 ? 0 : p.r < 2.2 ? 1 : 2
        // Udara dingin yang mengalir tampil sebagai goresan; udara panas yang diam tampil sebagai titik
        const len = Math.min(9, 0.6 + speed * 3.2)
        const k = speed || 1
        buckets[ci * WIDTHS.length + wi].push(p.x, p.y, p.x - (p.vx / k) * len, p.y - (p.vy / k) * len)
      }
      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i]
        if (b.length === 0) continue
        ctx.strokeStyle = LUT[Math.floor(i / WIDTHS.length)]
        ctx.lineWidth = WIDTHS[i % WIDTHS.length]
        ctx.beginPath()
        for (let j = 0; j < b.length; j += 4) {
          ctx.moveTo(b[j], b[j + 1])
          ctx.lineTo(b[j + 2], b[j + 3])
        }
        ctx.stroke()
      }
    }

    const setTemp = (avg: number) => {
      if (tempRef.current) tempRef.current.textContent = String(Math.round(22 + 12 * Math.max(0, Math.min(1, (avg - 0.08) / 0.92))))
    }

    if (reduced) {
      // langsung ke keadaan akhir (dijadwalkan, bukan setState sinkron di dalam effect)
      const t = setTimeout(() => setPhase('cool'), 0)
      draw()
      setTemp(0)
      const ro = new ResizeObserver(() => {
        resize()
        draw()
      })
      ro.observe(wrap)
      return () => {
        clearTimeout(t)
        ro.disconnect()
      }
    }

    // ---------- simulasi ----------
    let raf = 0
    let running = false
    let visible = true
    let started = 0
    let cooling = 0 // 0..1
    let acOn = false
    let lastTempAt = 0
    const pointer = { x: -999, y: -999, active: false }

    const step = (now: number) => {
      if (!started) started = now
      const el = now - started
      if (el > 1700) {
        acOn = true
        cooling = Math.min(1, 1 - Math.pow(1 - Math.min(1, (el - 1700) / 2800), 3))
      }
      const tTarget = 1 - 0.92 * cooling

      let sum = 0
      for (const p of ps) {
        // gerak acak: udara panas lebih gelisah
        const jitter = 0.12 + p.t * 0.12
        p.vx += (Math.random() - 0.5) * jitter
        p.vy += (Math.random() - 0.5) * jitter
        // udara panas naik, udara dingin turun
        // hanya udara panas yang naik; udara dingin diam menyebar
        p.vy -= Math.max(0, p.t - 0.4) * 0.03
        p.vy += Math.max(0, 0.4 - p.t) * 0.008 // udara dingin turun pelan ke area tamu

        if (acOn) {
          for (const e of EMITTERS) {
            const dx = p.x - e.x
            const dy = p.y - e.y
            const d = Math.hypot(dx, dy)
            const ahead = dx * e.dir > -8
            if (d < 120 && ahead) {
              // tiupan kuat di dekat kisi, melemah cepat: udara dingin menyebar, tidak bertabrakan di tengah
              const f = Math.pow(1 - d / 120, 2) * cooling
              p.vx += e.dir * f * 0.32
              p.vy += (Math.random() - 0.5) * 0.25 * f
              p.t -= 0.045 * f
            }
          }
        }
        p.t += (tTarget - p.t) * 0.012

        if (pointer.active) {
          const d = Math.hypot(p.x - pointer.x, p.y - pointer.y)
          if (d < 64) {
            const f = 1 - d / 64
            p.t = Math.min(1, p.t + 0.09 * f)
            p.vy -= 0.05 * f
          }
        }
        p.t = Math.max(0, Math.min(1, p.t))

        const damp = 0.93 + p.t * 0.03 // udara dingin cepat melambat dan berbaur
        p.vx *= damp
        p.vy *= damp
        const sp = Math.hypot(p.vx, p.vy)
        if (sp > 2.4) {
          p.vx = (p.vx / sp) * 2.4
          p.vy = (p.vy / sp) * 2.4
        }
        p.x += p.vx
        p.y += p.vy

        // batas: di dalam tenda
        if (p.x < LEFT) { p.x = LEFT; p.vx = Math.abs(p.vx) }
        if (p.x > RIGHT) { p.x = RIGHT; p.vx = -Math.abs(p.vx) }
        const top = roofY(p.x) + 8
        if (p.y < top) { p.y = top; p.vy = Math.abs(p.vy) * 0.6 }
        if (p.y > FLOOR - 2) { p.y = FLOOR - 2; p.vy = -Math.abs(p.vy) * 0.6 }
        sum += p.t
      }

      draw()
      if (now - lastTempAt > 90) {
        lastTempAt = now
        setTemp(sum / ps.length)
      }
      if (running) raf = requestAnimationFrame(step)
    }

    const play = () => {
      if (running || !visible || document.hidden) return
      running = true
      raf = requestAnimationFrame(step)
    }
    const pause = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    // urutan cerita (sekali)
    const timers = [
      window.setTimeout(() => setPhase('power'), 450),
      window.setTimeout(() => setPhase('cool'), 1700),
    ]

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) play()
      else pause()
    })
    io.observe(wrap)
    const onVis = () => (document.hidden ? pause() : play())
    document.addEventListener('visibilitychange', onVis)

    const ro = new ResizeObserver(() => {
      resize()
      if (!running) draw()
    })
    ro.observe(wrap)

    const toLocal = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect()
      pointer.x = (e.clientX - rect.left) / scale
      pointer.y = (e.clientY - rect.top) / scale
      pointer.active = true
    }
    const onLeave = () => (pointer.active = false)
    wrap.addEventListener('pointermove', toLocal)
    wrap.addEventListener('pointerdown', toLocal)
    wrap.addEventListener('pointerleave', onLeave)
    wrap.addEventListener('pointerup', onLeave)
    wrap.addEventListener('pointercancel', onLeave)

    draw()
    const hasIdle = typeof window.requestIdleCallback === 'function'
    // Mulai setelah halaman selesai dimuat dan browser idle, supaya tidak berebut dengan hidrasi dan LCP.
    let idle = 0
    let fallback: ReturnType<typeof setTimeout> | undefined
    const kickoff = () => {
      if (hasIdle) idle = window.requestIdleCallback(() => play(), { timeout: 1200 })
      else fallback = setTimeout(play, 400)
    }
    const onLoad = () => kickoff()
    if (document.readyState === 'complete') kickoff()
    else window.addEventListener('load', onLoad, { once: true })

    return () => {
      pause()
      timers.forEach(clearTimeout)
      if (hasIdle) window.cancelIdleCallback(idle)
      clearTimeout(fallback)
      window.removeEventListener('load', onLoad)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      wrap.removeEventListener('pointermove', toLocal)
      wrap.removeEventListener('pointerdown', toLocal)
      wrap.removeEventListener('pointerleave', onLeave)
      wrap.removeEventListener('pointerup', onLeave)
      wrap.removeEventListener('pointercancel', onLeave)
    }
  }, [])

  const power = phase !== 'hot'
  const cool = phase === 'cool'
  const line = cool ? 'var(--frost)' : 'var(--volt)'

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label="Ilustrasi tenda acara: genset menyala, lampu tenda hidup, lalu AC mendinginkan udara di dalam tenda dari 34 menjadi 22 derajat."
      className={cn('relative aspect-[600/420] w-full touch-pan-y select-none', className)}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />

      <svg viewBox={`0 0 ${VW} ${VH}`} className="absolute inset-0 size-full" aria-hidden="true" data-on={power}>
        <defs>
          <radialGradient id="bulb-glow">
            <stop offset="0%" stopColor="var(--volt)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--volt)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* lantai */}
        <path d="M24 380H576" stroke="rgb(255 255 255 / 0.18)" strokeWidth="1.5" />

        {/* atap + valance bergelombang khas tenda pernikahan */}
        <path
          d="M64 172 L300 66 L536 172"
          fill="none"
          stroke={line}
          strokeWidth="2.2"
          strokeLinejoin="round"
          className="transition-[stroke] duration-[1600ms]"
        />
        <path
          d={`M64 172 ${Array.from({ length: 12 }, (_, i) => {
            const x0 = 64 + i * (472 / 12)
            const x1 = x0 + 472 / 12
            return `Q${(x0 + x1) / 2} 190 ${x1} 172`
          }).join(' ')}`}
          fill="none"
          stroke={line}
          strokeOpacity="0.7"
          strokeWidth="1.6"
          className="transition-[stroke] duration-[1600ms]"
        />
        {/* tiang */}
        {[70, 530].map((x) => (
          <path key={x} d={`M${x} 172V380`} stroke="rgb(255 255 255 / 0.55)" strokeWidth="2" />
        ))}
        {[223, 377].map((x) => (
          <path key={x} d={`M${x} ${roofY(x) + 4}V380`} stroke="rgb(255 255 255 / 0.12)" strokeWidth="1.2" strokeDasharray="3 6" />
        ))}

        {/* meja tamu */}
        {[
          [190, 356],
          [300, 362],
          [410, 356],
        ].map(([x, y]) => (
          <g key={x} stroke="rgb(255 255 255 / 0.4)" strokeWidth="1.4" fill="none">
            <ellipse cx={x} cy={y} rx="30" ry="7" />
            <path d={`M${x} ${y + 7}V378`} />
          </g>
        ))}

        {/* lampu gantung: menyala berurutan setelah genset hidup */}
        <path
          d={`M92 188 ${BULBS.map((b) => `L${b.x} ${b.y}`).join(' ')}`}
          fill="none"
          stroke="rgb(255 255 255 / 0.25)"
          strokeWidth="1"
        />
        {BULBS.map((b, i) => (
          <g key={i}>
            {power && (
              <circle
                cx={b.x}
                cy={b.y + 5}
                r="14"
                fill="url(#bulb-glow)"
                className="lamp-on"
                style={{ animationDelay: `${300 + i * 55}ms`, transformOrigin: `${b.x}px ${b.y + 5}px`, transformBox: 'view-box' }}
              />
            )}
            <circle
              cx={b.x}
              cy={b.y + 5}
              r="3.2"
              fill={power ? 'var(--volt)' : 'rgb(255 255 255 / 0.2)'}
              className={power ? 'lamp-on' : undefined}
              style={power ? { animationDelay: `${300 + i * 55}ms`, transformOrigin: `${b.x}px ${b.y + 5}px`, transformBox: 'view-box' } : undefined}
            />
          </g>
        ))}

        {/* AC standing kiri & kanan */}
        {[
          { x: 104, led: 116 },
          { x: 466, led: 484 },
        ].map(({ x, led }) => (
          <g key={x}>
            <rect x={x} y="292" width="30" height="80" rx="5" fill="var(--ink)" stroke="rgb(255 255 255 / 0.75)" strokeWidth="1.6" />
            {[302, 308, 314].map((y) => (
              <path key={y} d={`M${x + 6} ${y}H${x + 24}`} stroke="rgb(255 255 255 / 0.5)" strokeWidth="1.2" />
            ))}
            <circle cx={led} cy="330" r="2.6" fill={cool ? 'var(--frost)' : 'rgb(255 255 255 / 0.25)'} className="transition-[fill] duration-500" />
          </g>
        ))}

        {/* genset di luar tenda + kabel daya */}
        <g>
          <rect x="548" y="338" width="44" height="40" rx="5" fill="var(--ink)" stroke="rgb(255 255 255 / 0.75)" strokeWidth="1.6" />
          <path d="M566 346l-5 10h6l-4 10" fill="none" stroke={power ? 'var(--volt)' : 'rgb(255 255 255 / 0.35)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M548 366 C540 366 536 360 530 354" fill="none" stroke="rgb(255 255 255 / 0.3)" strokeWidth="1.4" />
          <path
            d="M548 366 C540 366 536 360 530 354 L530 190"
            fill="none"
            stroke="var(--volt)"
            strokeWidth="1.8"
            className="draw-line"
            style={{ ['--len' as string]: 220 }}
          />
        </g>
      </svg>

      {/* pembacaan suhu */}
      <div className="pointer-events-none absolute top-[4%] right-[3%] text-right" aria-hidden="true">
        <p
          className={cn(
            'num text-5xl font-semibold transition-colors duration-[1600ms] sm:text-6xl',
            cool ? 'text-frost' : 'text-volt'
          )}
        >
          <span ref={tempRef}>34</span>°
        </p>
        <p className="mt-1 text-[11px] text-white/60 sm:text-xs">di dalam tenda</p>
      </div>
    </div>
  )
}

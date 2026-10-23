'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AcArt, ChatArt, GensetArt, ReturnArt, TruckArt } from './line-icons'

export type DayStep = { when: string; title: string; text: string; art: 'truck' | 'ac' | 'genset' | 'chat' | 'return' }

const ART = { truck: TruckArt, ac: AcArt, genset: GensetArt, chat: ChatArt, return: ReturnArt }

function Art({ name }: { name: DayStep['art'] }) {
  const C = ART[name]
  return <C />
}

/**
 * Jam hari-H: kolom kiri menempel (desktop) dan menggambar ulang ilustrasi langkah yang sedang dibaca.
 * Ini sungguhan urutan kerja, jadi penanda urutan (H-1, Hari H, ...) memang informasi.
 */
export function DayTimeline({ steps }: { steps: DayStep[] }) {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
        }
      },
      { rootMargin: '-45% 0px -45% 0px' }
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  const cur = steps[active]

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      {/* Panel menempel: hanya desktop */}
      <div className="hidden lg:col-span-5 lg:block">
        <div className="panel-night sticky top-28 overflow-hidden p-8">
          <p className="num text-6xl font-semibold text-volt">{cur.when}</p>
          <div key={active} data-on="true" className="mt-8 h-44 text-frost">
            <Art name={cur.art} />
          </div>
          <div className="mt-8 flex gap-1.5" aria-hidden="true">
            {steps.map((s, i) => (
              <span
                key={s.title}
                className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i <= active ? 'bg-frost' : 'bg-white/15')}
              />
            ))}
          </div>
        </div>
      </div>

      <ol className="lg:col-span-7">
        {steps.map((s, i) => (
          <li
            key={s.title}
            ref={(el) => {
              refs.current[i] = el
            }}
            data-index={i}
            className={cn(
              'group border-t border-white/12 py-10 first:border-t-0 first:pt-0 lg:py-16',
              i !== active && 'is-dim'
            )}
          >
            <p className="num text-sm font-semibold text-volt lg:hidden">{s.when}</p>
            <div data-on={i <= active} className="mt-4 h-24 text-frost lg:hidden">
              <Art name={s.art} />
            </div>
            <h3 className="mt-5 font-heading text-2xl font-semibold tracking-tight transition-colors duration-300 sm:text-3xl lg:mt-0 lg:group-[.is-dim]:text-white/55">{s.title}</h3>
            <p className="mt-3 max-w-md leading-relaxed text-white/70 transition-colors duration-300 lg:group-[.is-dim]:text-white/55">{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

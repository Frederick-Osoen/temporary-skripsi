'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, ShoppingBasket } from 'lucide-react'
import { useCart } from '@/lib/public/cart'
import { waLink } from '@/lib/public/business'
import { cn } from '@/lib/utils'

/**
 * Satu dok di bawah layar untuk keranjang + WhatsApp, supaya keduanya tidak saling menutupi.
 * Di /estimasi dok disembunyikan: estimator punya bilah total + tombol WhatsApp sendiri.
 *
 * Supaya tidak mengganggu:
 * - saat menggulir ke bawah (membaca), tombol chat mengecil jadi ikon; label kembali saat menggulir ke atas
 * - saat footer terlihat, dok menyingkir ke bawah layar (footer sudah punya ajakan WhatsApp sendiri)
 */
export function BottomDock({ waNumber }: { waNumber: string }) {
  const { count, ready } = useCart()
  const pathname = usePathname()
  const [compact, setCompact] = useState(false)
  const [atFooter, setAtFooter] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        if (Math.abs(y - last) > 8) {
          setCompact(y > last && y > 240)
          last = y
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const footer = document.querySelector('[data-dock-hide]')
    const io = footer
      ? new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting), { rootMargin: '0px 0px -40px 0px' })
      : null
    if (footer && io) io.observe(footer)
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
      io?.disconnect()
    }
  }, [pathname])

  if (pathname.startsWith('/estimasi')) return null
  const showCart = ready && count > 0

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-[transform,opacity] duration-300 ease-out',
        atFooter && 'translate-y-[calc(100%+1rem)] opacity-0'
      )}
      aria-hidden={atFooter || undefined}
      inert={atFooter || undefined}
    >
      <div className="mx-auto flex max-w-6xl items-end justify-end gap-3">
        {showCart && (
          <Link
            href="/estimasi"
            className="focus-ink pointer-events-auto flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full bg-ink pr-5 pl-2 text-sm font-medium text-white shadow-float transition-transform hover:-translate-y-0.5 sm:max-w-sm sm:flex-none"
          >
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <ShoppingBasket className="size-4" aria-hidden="true" />
              <span className="tnum absolute -top-1 -right-1 flex min-w-5 justify-center rounded-full bg-volt px-1 text-[11px] font-bold text-volt-foreground">
                {count}
              </span>
            </span>
            <span className="truncate">Hitung estimasi {count} barang</span>
          </Link>
        )}
        <a
          href={waLink(waNumber)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat admin JJ Teknik via WhatsApp"
          title="Chat admin via WhatsApp"
          className={cn(
            'focus-ink group pointer-events-auto flex h-14 shrink-0 items-center rounded-full bg-wa text-sm font-semibold text-white shadow-float transition-[padding,transform] duration-300 hover:-translate-y-0.5',
            compact ? 'px-[1.125rem]' : 'gap-2 px-4'
          )}
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          <span
            className={cn(
              'hidden overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 sm:inline-block',
              compact ? 'max-w-0 opacity-0' : 'max-w-32 opacity-100'
            )}
          >
            Chat admin
          </span>
        </a>
      </div>
    </div>
  )
}

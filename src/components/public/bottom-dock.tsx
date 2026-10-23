'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, ShoppingBasket } from 'lucide-react'
import { useCart } from '@/lib/public/cart'
import { waLink } from '@/lib/public/business'

/**
 * Satu dok di bawah layar untuk keranjang + WhatsApp, supaya keduanya tidak saling menutupi.
 * Di /estimasi dok disembunyikan: estimator punya bilah total + tombol WhatsApp sendiri.
 */
export function BottomDock({ waNumber }: { waNumber: string }) {
  const { count, ready } = useCart()
  const pathname = usePathname()
  if (pathname.startsWith('/estimasi')) return null
  const showCart = ready && count > 0

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
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
          className="focus-ink group pointer-events-auto flex h-14 shrink-0 items-center gap-2 rounded-full bg-wa px-4 text-sm font-semibold text-white shadow-float transition-transform hover:-translate-y-0.5"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Chat admin</span>
        </a>
      </div>
    </div>
  )
}

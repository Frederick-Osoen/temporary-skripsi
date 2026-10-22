'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, ShoppingBasket } from 'lucide-react'
import { useCart } from '@/lib/public/cart'

export function CartBar() {
  const { count, ready } = useCart()
  const pathname = usePathname()
  if (!ready || count === 0 || pathname.startsWith('/estimasi')) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link
        href="/estimasi"
        className="pointer-events-auto mx-auto flex w-full max-w-sm items-center gap-3 rounded-full bg-ink py-3 pr-4 pl-3 text-sm font-medium text-white shadow-soft transition-transform hover:-translate-y-0.5"
      >
        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
          <ShoppingBasket className="size-4" aria-hidden="true" />
          <span className="tnum absolute -top-1 -right-1 flex min-w-5 justify-center rounded-full bg-volt px-1 text-[11px] font-bold text-volt-foreground">
            {count}
          </span>
        </span>
        <span className="flex-1">Hitung estimasi{count === 1 ? ' 1 barang' : ` ${count} barang`}</span>
        <ArrowUpRight className="size-4 shrink-0 opacity-70" aria-hidden="true" />
      </Link>
    </div>
  )
}

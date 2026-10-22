'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingBasket } from 'lucide-react'
import { useCart } from '@/lib/public/cart'

export function CartBar() {
  const { count, ready } = useCart()
  const pathname = usePathname()
  if (!ready || count === 0 || pathname.startsWith('/estimasi')) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link
        href="/estimasi"
        className="pointer-events-auto mx-auto flex max-w-md items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg"
      >
        <ShoppingBasket className="h-4 w-4" />
        Lihat Estimasi ({count} barang)
      </Link>
    </div>
  )
}
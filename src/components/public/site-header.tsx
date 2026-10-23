'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, MessageCircle, ShoppingBasket, Snowflake, Zap } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCart } from '@/lib/public/cart'
import { STORE_NAME } from '@/lib/public/config'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Beranda' },
  { href: '/katalog', label: 'Katalog' },
  { href: '/estimasi', label: 'Estimasi' },
]

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

export function Mark({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink', className)}>
      <Snowflake className="size-4.5 text-frost" aria-hidden="true" />
      <Zap className="absolute -right-1 -bottom-1 size-4 rounded-full bg-volt p-0.5 text-volt-foreground" aria-hidden="true" />
    </span>
  )
}

export function SiteHeader({ waNumber }: { waNumber: string }) {
  const pathname = usePathname()
  const { count, ready } = useCart()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const wa = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo ${STORE_NAME}, saya ingin bertanya.`)}`
  const showCart = ready && count > 0 && !pathname.startsWith('/estimasi')

  return (
    <header className="sticky top-0 z-50">
      <div className={cn('bg-background/85 backdrop-blur-md transition-shadow', scrolled && 'shadow-soft')}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="group flex items-center gap-2.5 rounded-md" aria-label={`${STORE_NAME}, beranda`}>
            <Mark />
            <span className="leading-tight">
              <span className="block font-heading text-[15px] font-bold tracking-tight">{STORE_NAME}</span>
              <span className="hidden text-[11px] text-muted-foreground sm:block">Pandaan, Jawa Timur</span>
            </span>
          </Link>

          <nav aria-label="Navigasi utama" className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = isActive(pathname, n.href)
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative rounded-md px-3 py-2 text-sm transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {n.label}
                  {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-volt" aria-hidden="true" />}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-2">
            {showCart && (
              <Link
                href="/estimasi"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'relative px-3' })}
                aria-label={`Lihat estimasi, ${count} barang di keranjang`}
              >
                <ShoppingBasket className="size-4" />
                <span className="tnum text-xs font-semibold">{count}</span>
              </Link>
            )}
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: 'sm', className: 'hidden px-3 sm:inline-flex' })}
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="Buka menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(20rem,85vw)] p-0">
                <SheetHeader className="border-b px-5 py-4 text-left">
                  <SheetTitle className="flex items-center gap-2.5">
                    <Mark />
                    <span className="font-heading text-base font-bold">{STORE_NAME}</span>
                  </SheetTitle>
                </SheetHeader>
                <nav aria-label="Navigasi utama" className="flex flex-col p-3">
                  {NAV.map((n) => {
                    const active = isActive(pathname, n.href)
                    return (
                      <Link
                        key={n.href}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-3 font-heading text-lg font-semibold',
                          active ? 'bg-muted text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {n.label}
                        {active && <span className="size-1.5 rounded-full bg-volt" aria-hidden="true" />}
                      </Link>
                    )
                  })}
                </nav>
                <div className="px-3">
                  <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: 'h-11 w-full' })}>
                    <MessageCircle className="size-4" /> Tanya lewat WhatsApp
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      <div className="rule-thermal" aria-hidden="true" />
    </header>
  )
}

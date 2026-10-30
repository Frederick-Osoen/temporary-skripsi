'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, MessageCircle, ShoppingBasket } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCart } from '@/lib/public/cart'
import { waLink } from '@/lib/public/business'
import { cn } from '@/lib/utils'
import { geologica, unbounded } from '@/app/(public)/fonts'
import { Wordmark } from './brand-mark'

const NAV = [
  { href: '/katalog', label: 'Katalog' },
  { href: '/kalkulator', label: 'Kalkulator' },
  { href: '/galeri', label: 'Galeri' },
  { href: '/artikel', label: 'Artikel' },
  { href: '/tentang', label: 'Tentang' },
  { href: '/kontak', label: 'Kontak' },
]
const MOBILE_EXTRA = [
  { href: '/', label: 'Beranda' },
  { href: '/estimasi', label: 'Estimasi biaya' },
  { href: '/testimoni', label: 'Testimoni' },
]

// Halaman yang dibuka dengan band malam: header ikut gelap sampai digulir.
// Tambahkan rute di sini bila seksi pertama halaman baru memakai `band-night`.
const NIGHT_ROUTES = ['/', '/tentang', '/kalkulator']

const isActive = (pathname: string, href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

export function SiteHeader({ waNumber }: { waNumber: string }) {
  const pathname = usePathname()
  const { count, ready } = useCart()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const night = NIGHT_ROUTES.includes(pathname) && !scrolled
  const showCart = ready && count > 0 && !pathname.startsWith('/estimasi')

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-[background-color,box-shadow,color] duration-300',
        night ? 'bg-ink text-white' : 'bg-background/85 text-foreground shadow-[0_1px_0_var(--border)] backdrop-blur-lg'
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="focus-ink rounded-lg" aria-label="JJ Teknik, ke beranda">
          <Wordmark tone={night ? 'night' : 'day'} />
        </Link>

        <nav aria-label="Navigasi utama" className="ml-auto hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => {
            const active = isActive(pathname, n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-ink relative rounded-full px-3.5 py-2 text-sm transition-colors',
                  night
                    ? active ? 'bg-white/12 text-white' : 'text-white/70 hover:text-white'
                    : active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          {showCart && (
            <Link
              href="/estimasi"
              aria-label={`Lihat estimasi, ${count} barang di keranjang`}
              className={cn(
                'focus-ink relative flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold',
                night ? 'bg-white/10 text-white' : 'bg-muted text-foreground'
              )}
            >
              <ShoppingBasket className="size-4" aria-hidden="true" />
              <span className="tnum">{count}</span>
            </Link>
          )}
          {/* Selalu ada di semua halaman. Di atas band malam tampil sebagai tombol garis supaya amber hero tetap satu-satunya CTA utama */}
          {!pathname.startsWith('/estimasi') && (
            <Link
              href="/estimasi"
              className={cn(
                night
                  ? 'focus-ink hidden h-10 items-center rounded-full px-4 text-sm font-medium text-white ring-1 ring-white/30 transition-colors ring-inset hover:bg-white/10 sm:inline-flex'
                  : buttonVariants({ className: 'hidden h-10 rounded-full px-4 sm:inline-flex' })
              )}
            >
              Hitung estimasi
            </Link>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={cn(
                'focus-ink flex size-10 items-center justify-center rounded-full lg:hidden',
                night ? 'bg-white/10 text-white' : 'bg-muted text-foreground'
              )}
              aria-label="Buka menu"
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className={cn('theme-public w-[min(22rem,88vw)] border-0 bg-ink! p-0 text-white! [&_[data-slot=sheet-close]]:top-5 [&_[data-slot=sheet-close]]:text-white [&_[data-slot=sheet-close]]:hover:bg-white/10', unbounded.variable, geologica.variable)}>
              <SheetHeader className="px-5 pt-5 pb-2 text-left">
                <SheetTitle className="text-white">
                  <Wordmark tone="night" />
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Navigasi utama" className="flex flex-col px-3 py-4">
                {[...MOBILE_EXTRA.slice(0, 1), ...NAV, ...MOBILE_EXTRA.slice(1)].map((n) => {
                  const active = isActive(pathname, n.href)
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'focus-ink flex items-center justify-between rounded-xl px-3 py-3 font-heading text-lg font-medium tracking-tight',
                        active ? 'bg-white/10 text-white' : 'text-white/70'
                      )}
                    >
                      {n.label}
                      {active && <span className="size-2 rounded-full bg-volt" aria-hidden="true" />}
                    </Link>
                  )
                })}
              </nav>
              <div className="mt-auto space-y-2 p-5">
                <a
                  href={waLink(waNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ink flex h-12 items-center justify-center gap-2 rounded-full bg-volt font-semibold text-volt-foreground"
                >
                  <MessageCircle className="size-4" aria-hidden="true" /> Chat admin via WhatsApp
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { STORE_NAME } from '@/lib/public/config'

const NAV = [
  { href: '/', label: 'Beranda' },
  { href: '/katalog', label: 'Katalog' },
  { href: '/estimasi', label: 'Estimasi' },
]

export function SiteHeader({ waNumber }: { waNumber: string }) {
  const wa = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo ${STORE_NAME}, saya ingin bertanya.`)}`
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">{STORE_NAME}</Link>
        <nav aria-label="Navigasi utama" className="flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              {n.label}
            </Link>
          ))}
          <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: 'sm', className: 'ml-2' })}>
            WhatsApp
          </a>
        </nav>
      </div>
    </header>
  )
}
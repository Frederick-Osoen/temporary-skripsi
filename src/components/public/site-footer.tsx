import Link from 'next/link'
import { MapPin, MessageCircle, Snowflake, Zap } from 'lucide-react'
import { STORE_NAME } from '@/lib/public/config'
import { getStoreSettings } from '@/lib/settings'

const LINKS = [
  { href: '/katalog#sewa', label: 'Sewa AC & pendingin' },
  { href: '/katalog#genset', label: 'Sewa genset' },
  { href: '/katalog#jual', label: 'Sparepart AC' },
  { href: '/estimasi', label: 'Hitung estimasi' },
]

export async function SiteFooter() {
  const { wa_number } = await getStoreSettings()
  const wa = `https://wa.me/${wa_number}?text=${encodeURIComponent(`Halo ${STORE_NAME}, saya ingin bertanya.`)}`

  return (
    <footer className="surface-ink bg-noise mt-auto">
      <div className="rule-thermal" aria-hidden="true" />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex size-9 items-center justify-center rounded-xl bg-white/10">
              <Snowflake className="size-4.5 text-frost" aria-hidden="true" />
              <Zap className="absolute -right-1 -bottom-1 size-4 rounded-full bg-volt p-0.5 text-volt-foreground" aria-hidden="true" />
            </span>
            <span className="font-heading text-lg font-bold">{STORE_NAME}</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/70">
            Penyewaan AC standing, genset, dan misty fan untuk acara dan industri, serta penjualan sparepart AC. Unit diantar
            dan dipasang tim kami.
          </p>
          <p className="flex items-center gap-2 text-sm text-white/70">
            <MapPin className="size-4 shrink-0 text-frost" aria-hidden="true" />
            Pandaan, Kabupaten Pasuruan, Jawa Timur
          </p>
        </div>

        <nav aria-label="Layanan" className="space-y-3">
          <h2 className="font-heading text-sm font-semibold text-white">Layanan</h2>
          <ul className="space-y-2 text-sm">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="focus-ink rounded text-white/70 transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          <h2 className="font-heading text-sm font-semibold text-white">Hubungi kami</h2>
          <p className="text-sm text-white/70">
            Pertanyaan, ketersediaan, dan harga final dibahas langsung lewat WhatsApp.
          </p>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ink inline-flex h-10 items-center gap-2 rounded-md bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            <MessageCircle className="size-4" aria-hidden="true" /> Chat admin
          </a>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-xs text-white/55">
          <p>
            © {new Date().getFullYear()} {STORE_NAME}
          </p>
          <p>Angka di situs ini adalah estimasi; harga final disepakati lewat WhatsApp.</p>
        </div>
      </div>
    </footer>
  )
}

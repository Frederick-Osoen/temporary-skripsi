import Link from 'next/link'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { getStoreSettings, parseOpeningHours } from '@/lib/settings'
import { BUSINESS, fullAddress, waLink } from '@/lib/public/business'
import { Wordmark } from './brand-mark'
import { InstagramIcon, TikTokIcon } from './social-icons'

const COLS = [
  {
    title: 'Layanan',
    links: [
      { href: '/katalog#sewa', label: 'Sewa AC standing & misty fan' },
      { href: '/katalog#genset', label: 'Sewa genset' },
      { href: '/katalog#jual', label: 'Sparepart AC' },
      { href: '/kalkulator', label: 'Kalkulator kebutuhan' },
      { href: '/estimasi', label: 'Estimasi biaya' },
    ],
  },
  {
    title: 'JJ Teknik',
    links: [
      { href: '/tentang', label: 'Tentang kami' },
      { href: '/galeri', label: 'Galeri pemasangan' },
      { href: '/testimoni', label: 'Testimoni' },
      { href: '/artikel', label: 'Artikel' },
      { href: '/kontak', label: 'Kontak & lokasi' },
    ],
  },
]

export async function SiteFooter() {
  const { wa_number, opening_hours, store_phone, contact_email, instagram_url, tiktok_url } = await getStoreSettings()
  const hours = parseOpeningHours(opening_hours)

  return (
    <footer data-dock-hide className="band-night grain">
      {/* Penutup: satu ajakan terakhir sebelum detail kontak */}
      <div className="mx-auto max-w-6xl px-4 pt-20 pb-14 sm:pt-24">
        <p className="max-w-3xl font-heading text-4xl leading-[1.02] font-semibold tracking-tight sm:text-6xl">
          Acara Anda,
          <br />
          <span className="text-frost">tanpa keringat.</span>
        </p>
        <p className="mt-5 max-w-lg text-white/70">
          Ceritakan tanggal, lokasi, dan jumlah tamu. Admin membantu menghitung kebutuhan AC dan genset, lalu
          mengirim penawaran lewat WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/estimasi"
            className="focus-ink inline-flex h-12 items-center rounded-full bg-volt px-6 font-semibold text-volt-foreground transition-transform hover:-translate-y-0.5"
          >
            Hitung estimasi
          </Link>
          <a
            href={waLink(wa_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ink inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-6 font-medium text-white transition-colors hover:bg-white/10"
          >
            <MessageCircle className="size-4" aria-hidden="true" /> Chat admin
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div className="space-y-4">
            <Wordmark tone="night" />
            <p className="max-w-xs text-sm leading-relaxed text-white/65">{BUSINESS.legalTagline}</p>
            <p className="text-sm text-white/65">Melayani acara dan industri di Jawa, Bali, dan Lombok.</p>
          </div>

          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title} className="space-y-3">
              <h2 className="text-sm font-semibold text-white">{c.title}</h2>
              <ul className="space-y-2.5 text-sm">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="focus-ink rounded text-white/65 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="space-y-3 text-sm">
            <h2 className="font-semibold text-white">Toko &amp; gudang</h2>
            <a
              href={BUSINESS.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ink flex gap-2 rounded leading-relaxed text-white/65 hover:text-white"
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-frost" aria-hidden="true" />
              {fullAddress}
            </a>
            
            {contact_email && (
              <p className="flex gap-2 text-white/65">
                <Mail className="mt-0.5 size-4 shrink-0 text-frost" aria-hidden="true" />
                <a href={`mailto:${contact_email}`} className="focus-ink rounded break-all underline-offset-4 hover:underline">{contact_email}</a>
              </p>
            )}
            {store_phone && (
              <p className="flex gap-2 text-white/65">
                <Phone className="mt-0.5 size-4 shrink-0 text-frost" aria-hidden="true" />
                <a href={`tel:${store_phone.replace(/[^\d+]/g, '')}`} className="tnum focus-ink rounded underline-offset-4 hover:underline">{store_phone}</a>
              </p>
            )}

            {/* Jam Buka */}
            {hours.length > 0 ? (
              <ul className="space-y-1 text-white/65">
                {hours.map((h) => (
                  <li key={h.days}>
                    {h.days}{h.time && <>: <span className="tnum">{h.time}</span></>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-white/65">Jam buka: tanyakan lewat WhatsApp sebelum datang.</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-6 pb-28 text-xs text-white/50 sm:pb-8">
          <div className="flex items-center gap-3">
            <p>© {new Date().getFullYear()} JJ Teknik, Pandaan.</p>
            {instagram_url && (
              <a href={instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram JJ Teknik" className="focus-ink rounded-full p-1 text-white/60 transition-colors hover:text-white">
                <InstagramIcon className="size-[18px]" />
              </a>
            )}
            {tiktok_url && (
              <a href={tiktok_url} target="_blank" rel="noopener noreferrer" aria-label="TikTok JJ Teknik" className="focus-ink rounded-full p-1 text-white/60 transition-colors hover:text-white">
                <TikTokIcon className="size-[18px]" />
              </a>
            )}
          </div>
          <p>Harga di situs ini estimasi. Harga final disepakati lewat WhatsApp.</p>
        </div>
      </div>
    </footer>
  )
}

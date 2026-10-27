import type { Metadata } from 'next'
import Image from 'next/image'
import { MapPin, MessageCircle, Navigation } from 'lucide-react'
import { JsonLd, localBusinessLd } from '@/components/public/json-ld'
import { MapEmbed } from '@/components/public/map-embed'
import { PageHero } from '@/components/public/page-hero'
import { InstagramIcon, TikTokIcon } from '@/components/public/social-icons'
import { BUSINESS, fullAddress, waLink } from '@/lib/public/business'
import { getStoreSettings, parseOpeningHours } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Kontak & Lokasi',
  description: `Toko dan gudang JJ Teknik di ${fullAddress}. Hubungi admin lewat WhatsApp.`,
}

export default async function ContactPage() {
  const { wa_number, opening_hours, store_phone, contact_email, instagram_url, tiktok_url } = await getStoreSettings()
  const hours = parseOpeningHours(opening_hours)
  return (
    <>
      <JsonLd data={localBusinessLd(wa_number)} />
      <PageHero title="Mampir, atau chat saja." lead="Pertanyaan, ketersediaan tanggal, dan harga final dibahas langsung dengan admin lewat WhatsApp." />

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-5">
          <a
            href={waLink(wa_number)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ink group flex items-center gap-4 rounded-2xl bg-wa p-5 text-white transition-transform hover:-translate-y-0.5"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <MessageCircle className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-heading text-lg font-semibold">Chat admin</span>
              <span className="text-sm text-white">Dibalas langsung oleh pemilik toko</span>
            </span>
          </a>

          <div>
            <h2 className="font-heading text-lg font-semibold">Toko &amp; gudang</h2>
            <p className="mt-3 flex gap-3 leading-relaxed text-muted-foreground">
              <MapPin className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
              {fullAddress}
            </p>
            {store_phone && (
              <p className="mt-3 text-muted-foreground">
                Telepon:{' '}
                <a href={`tel:${store_phone.replace(/[^\d+]/g, '')}`} className="tnum focus-ink rounded font-medium text-foreground underline-offset-4 hover:underline">
                  {store_phone}
                </a>
              </p>
            )}
            {contact_email && (
              <p className="mt-3 text-muted-foreground">
                Email:{' '}
                <a href={`mailto:${contact_email}`} className="focus-ink rounded font-medium break-all text-foreground underline-offset-4 hover:underline">{contact_email}</a>
              </p>
            )}
            <a
              href={BUSINESS.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ink mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-input bg-card px-5 text-sm font-medium hover:bg-muted"
            >
              <Navigation className="size-4" aria-hidden="true" /> Buka di Google Maps
            </a>
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold">Jam buka</h2>
            {hours.length > 0 ? (
              <dl className="mt-3 space-y-1.5">
                {hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-6 border-b pb-1.5">
                    <dt className="text-muted-foreground">{h.days}</dt>
                    <dd className="tnum font-medium">{h.time}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-muted-foreground">Tanyakan lewat WhatsApp sebelum datang, supaya admin bisa menyiapkan barangnya.</p>
            )}
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold">Area layanan</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Melayani Jawa, Bali, dan Lombok. Gratis ongkir dalam radius {BUSINESS.freeRadiusKm} km dari gudang.
            </p>
          </div>

          {(instagram_url || tiktok_url) && (
            <div>
              <h2 className="font-heading text-lg font-semibold">Temukan kami juga di</h2>
              <p className="mt-3 flex flex-wrap gap-2">
                {instagram_url && (
                  <a href={instagram_url} target="_blank" rel="noopener noreferrer" className="focus-ink inline-flex h-11 items-center gap-2 rounded-full border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-muted">
                    <InstagramIcon className="size-4" /> Instagram
                  </a>
                )}
                {tiktok_url && (
                  <a href={tiktok_url} target="_blank" rel="noopener noreferrer" className="focus-ink inline-flex h-11 items-center gap-2 rounded-full border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-muted">
                    <TikTokIcon className="size-4" /> TikTok
                  </a>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-7">
          <MapEmbed />
          {/* TODO(owner): ganti dengan foto toko yang diambil sendiri (foto ini tampak berasal dari Google Maps). */}
          <figure>
            <Image
              src="/brand/toko.png"
              alt="Tampak depan toko JJ Teknik di Jl. Sedap Malam No.16, Pandaan"
              width={1024}
              height={734}
              sizes="(min-width: 1024px) 40rem, 100vw"
              className="h-auto w-full rounded-2xl border"
            />
            <figcaption className="mt-2 text-sm text-muted-foreground">Cari spanduk biru bertuliskan JJ Teknik.</figcaption>
          </figure>
        </div>
      </div>
    </>
  )
}

import type { Metadata } from 'next'
import Image from 'next/image'
import { BadgeCheck, HandCoins, MessageCircle, Truck } from 'lucide-react'
import Link from 'next/link'
import { BUSINESS, GUARANTEE } from '@/lib/public/business'
import { getGallery } from '@/lib/public/content'
import { TEAM, TEAM_PHOTO } from '@/lib/public/team'
import { productImageUrl } from '@/lib/storage'
import { PlayWhenVisible } from '@/components/public/play-when-visible'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description:
    'JJ Teknik berdiri sejak 2020 di Pandaan, Pasuruan. Sewa AC standing, misty fan, dan genset dengan armada sendiri, serta pengadaan dan servis AC.',
}

const FACTS = [
  { value: String(BUSINESS.founded), label: 'Tahun berdiri, di Pandaan' },
  { value: '2', label: 'Jenis armada sendiri: pickup dan truk engkel' },
  { value: `${BUSINESS.freeRadiusKm} km`, label: 'Radius gratis ongkir dari gudang' },
  { value: 'Bali', label: 'Lokasi terjauh yang pernah kami layani' },
]

const REASONS = [
  { icon: BadgeCheck, title: 'Garansi dingin', text: GUARANTEE.headline + ' ' + GUARANTEE.terms },
  { icon: Truck, title: 'Armada sendiri', text: 'Pengantaran dan pemasangan memakai mobil pickup dan truk engkel milik kami, jadi jadwalnya kami pegang sendiri.' },
  { icon: MessageCircle, title: 'Dibalas pemiliknya', text: 'Chat Anda dibaca dan dibalas langsung oleh pemilik toko, cepat, dari tanya-tanya sampai acara selesai.' },
  { icon: HandCoins, title: 'Harga bisa dinego', text: 'Angka di situs adalah titik awal. Harga final dibicarakan terbuka lewat WhatsApp.' },
]

// Cincin jangkauan: Pandaan di tengah. Bukan peta berskala, hanya gambaran jangkauan.
// Animasi: titik menyala, cincin meluas berurutan, cincin putus-putus berputar, denyut dingin dari pusat.
function ReachRings() {
  const rings = [
    { r: 54, label: `${BUSINESS.freeRadiusKm} km gratis ongkir`, tone: 'var(--frost)', dash: undefined, spin: '' },
    { r: 104, label: 'Jawa Timur', tone: 'rgb(255 255 255 / 0.55)', dash: '2 7', spin: 'reach-spin-rev' },
    { r: 150, label: 'Sampai Bali', tone: 'var(--volt)', dash: '4 6', spin: 'reach-spin' },
  ]
  return (
    <svg viewBox="0 -20 320 345" className="reach mx-auto w-full max-w-sm overflow-visible" role="img" aria-label="Jangkauan layanan: gratis ongkir 25 km dari Pandaan, paling sering Jawa Timur, pernah sampai Bali.">
      <defs>
        <radialGradient id="reach-glow">
          <stop offset="0" stopColor="var(--frost)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--frost)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Denyut udara dingin dari gudang, berulang */}
      <circle cx="160" cy="160" r="54" fill="url(#reach-glow)" stroke="var(--frost)" strokeOpacity="0.5" className="reach-pulse" />
      {rings.map((g, i) => (
        <g key={g.r}>
          <g className="reach-grow" style={{ animationDelay: `${200 + i * 220}ms` }}>
            <circle cx="160" cy="160" r={g.r} fill="none" stroke={g.tone} strokeOpacity="0.75" strokeDasharray={g.dash} className={g.spin || undefined} />
          </g>
          <text
            x="160"
            y={160 - g.r - 6}
            textAnchor="middle"
            fill={g.tone}
            fontSize="11"
            className="reach-fade"
            style={{ fontFamily: 'var(--font-sans)', animationDelay: `${520 + i * 220}ms` }}
          >
            {g.label}
          </text>
        </g>
      ))}
      <circle cx="160" cy="160" r="7" fill="var(--volt)" className="reach-dot" />
      <circle cx="160" cy="160" r="15" fill="none" stroke="var(--volt)" strokeOpacity="0.5" className="reach-grow" style={{ animationDelay: '120ms' }} />
      <text x="160" y="190" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600" className="reach-fade" style={{ fontFamily: 'var(--font-heading)', animationDelay: '250ms' }}>
        Pandaan
      </text>
    </svg>
  )
}

export default async function AboutPage() {
  const gallery = (await getGallery()).filter((g) => productImageUrl(g.image_path)).slice(0, 5)
  // Mozaik (1 besar + 4 kecil) hanya bila ada 5 foto; selain itu grid rata
  const mosaic = gallery.length === 5
  return (
    <>
      <section className="band-night grain">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:pt-16 lg:grid-cols-12 lg:pb-28">
          <div className="lg:col-span-7">
            <h1 className="font-heading text-4xl leading-[1.02] font-semibold sm:text-6xl">Dari Pandaan, sejak {BUSINESS.founded}.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              JJ Teknik didirikan oleh {BUSINESS.owner} di Pandaan, Pasuruan. Toko kami menjual AC dan sparepart pendingin,
              menyewakan AC standing, misty fan, dan genset untuk acara dan industri, serta menangani pengadaan, maintenance,
              dan servis AC.
            </p>
            <p className="mt-4 max-w-xl leading-relaxed text-white/65">
              Pelanggan kami datang dari pernikahan, ulang tahun, acara perusahaan, sampai area produksi pabrik. Sebagian besar
              di Jawa Timur, dan pernah sampai ke Bali.
            </p>
          </div>
          <div className="lg:col-span-5">
            <PlayWhenVisible>
              <ReachRings />
            </PlayWhenVisible>
          </div>
        </div>
      </section>

      {/* Pelat fakta: semua angka dari data nyata */}
      <section aria-label="Fakta singkat" className="border-b bg-card">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 px-4 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <div
              key={f.label}
              className={`py-8 pr-4 sm:px-6 ${i % 2 === 1 ? 'border-l pl-4' : ''} ${i < 2 ? 'border-b lg:border-b-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
            >
              <dt className="num text-3xl font-semibold text-ink sm:text-4xl">{f.value}</dt>
              <dd className="mt-2 max-w-[22ch] text-sm leading-relaxed text-muted-foreground">{f.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="alasan" className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <h2 id="alasan" className="max-w-2xl font-heading text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.08]">
          Empat hal yang kami pegang.
        </h2>
        <ul className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {REASONS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-frost">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-heading text-lg font-semibold">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Tim: hanya tampil bila sudah ada foto asli (lihat src/lib/public/team.ts) */}
      {(TEAM.length > 0 || TEAM_PHOTO) && (
        <section aria-labelledby="tim" className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
            <h2 id="tim" className="max-w-2xl font-heading text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.08]">
              Orang di balik JJ Teknik.
            </h2>
            {TEAM_PHOTO && (
              <figure className="mt-10">
                <Image
                  src={TEAM_PHOTO.src}
                  alt={TEAM_PHOTO.alt}
                  width={1600}
                  height={900}
                  sizes="(min-width: 1152px) 72rem, 100vw"
                  className="aspect-[16/9] h-auto w-full rounded-2xl border object-cover"
                />
              </figure>
            )}
            {TEAM.length > 0 && (
              <ul className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {TEAM.map((m) => (
                  <li key={m.name}>
                    <Image
                      src={m.photo}
                      alt={`${m.name}, ${m.role} JJ Teknik`}
                      width={800}
                      height={1000}
                      sizes="(min-width: 1024px) 17rem, (min-width: 640px) 33vw, 50vw"
                      className="aspect-[4/5] h-auto w-full rounded-2xl border object-cover"
                    />
                    <p className="mt-3 font-heading text-base font-semibold">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.role}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Potongan galeri: diambil dari Galeri di dashboard, tersembunyi bila kosong */}
      {gallery.length > 0 && (
        <section aria-labelledby="lapangan" className="band-night grain">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <h2 id="lapangan" className="font-heading text-3xl font-semibold sm:text-[2.6rem]">Sebagian pekerjaan kami.</h2>
              <Link href="/galeri" className="focus-ink rounded text-sm font-medium text-frost underline-offset-4 hover:underline">
                Lihat galeri
              </Link>
            </div>
            <ul className={`mt-10 grid grid-cols-2 gap-3 sm:gap-4 ${mosaic ? 'lg:grid-cols-4' : gallery.length >= 3 ? 'lg:grid-cols-4' : ''}`}>
              {gallery.map((g, i) => (
                <li key={g.id} className={mosaic && i === 0 ? 'col-span-2 lg:row-span-2' : ''}>
                  <figure className="group relative h-full overflow-hidden rounded-2xl">
                    <Image
                      src={productImageUrl(g.image_path) ?? ''}
                      alt={g.caption}
                      width={900}
                      height={900}
                      sizes={mosaic && i === 0 ? '(min-width: 1024px) 36rem, 100vw' : '(min-width: 1024px) 18rem, 50vw'}
                      className="aspect-square h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent px-3 pt-8 pb-3 text-xs text-white">
                      {g.caption}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="toko" className="border-t bg-muted/60">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:py-24 lg:grid-cols-12">
          <figure className="lg:col-span-7">
            {/* TODO(owner): ganti dengan foto toko yang diambil sendiri (foto ini tampak berasal dari Google Maps). */}
            <Image
              src="/brand/toko.png"
              alt="Tampak depan toko JJ Teknik dengan spanduk biru di Jl. Sedap Malam, Pandaan"
              width={1024}
              height={734}
              sizes="(min-width: 1024px) 40rem, 100vw"
              className="h-auto w-full rounded-2xl border"
            />
          </figure>
          <div className="lg:col-span-5">
            <h2 id="toko" className="font-heading text-3xl font-semibold">Toko dan gudang kami.</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Unit sewa berangkat dari sini. Sparepart bisa dibeli dan diambil langsung di toko.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

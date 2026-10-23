import type { Metadata } from 'next'
import Image from 'next/image'
import { BadgeCheck, HandCoins, MessageCircle, Truck } from 'lucide-react'
import { BUSINESS, GUARANTEE } from '@/lib/public/business'

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
function ReachRings() {
  const rings = [
    { r: 54, label: `${BUSINESS.freeRadiusKm} km gratis ongkir`, tone: 'var(--frost)' },
    { r: 104, label: 'Jawa Timur', tone: 'rgb(255 255 255 / 0.55)' },
    { r: 150, label: 'Sampai Bali', tone: 'var(--volt)' },
  ]
  return (
    <svg viewBox="0 -20 320 345" className="mx-auto w-full max-w-sm" role="img" aria-label="Jangkauan layanan: gratis ongkir 25 km dari Pandaan, paling sering Jawa Timur, pernah sampai Bali.">
      {rings.map((g) => (
        <g key={g.r}>
          <circle cx="160" cy="160" r={g.r} fill="none" stroke={g.tone} strokeOpacity="0.7" strokeDasharray={g.r === 150 ? '4 6' : undefined} />
          <text x="160" y={160 - g.r - 6} textAnchor="middle" fill={g.tone} fontSize="11" style={{ fontFamily: 'var(--font-sans)' }}>
            {g.label}
          </text>
        </g>
      ))}
      <circle cx="160" cy="160" r="7" fill="var(--volt)" />
      <circle cx="160" cy="160" r="15" fill="none" stroke="var(--volt)" strokeOpacity="0.5" className="drift" />
      <text x="160" y="190" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600" style={{ fontFamily: 'var(--font-heading)' }}>
        Pandaan
      </text>
    </svg>
  )
}

export default function AboutPage() {
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
            <ReachRings />
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

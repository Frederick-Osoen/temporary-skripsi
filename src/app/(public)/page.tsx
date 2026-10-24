import Link from 'next/link'
import { Truck, Wrench, MapPin } from 'lucide-react'
import { DayTimeline, type DayStep } from '@/components/public/day-timeline'
import { FaqList } from '@/components/public/faq-list'
import { GuaranteeStamp } from '@/components/public/guarantee-stamp'
import { JsonLd, faqLd, localBusinessLd } from '@/components/public/json-ld'
import { NeedsCalculator } from '@/components/public/needs-calculator'
import { ProductCard } from '@/components/public/product-card'
import { TentScene } from '@/components/public/tent-scene'
import { TestimonialList } from '@/components/public/testimonial-list'
import { GalleryGrid } from '@/components/public/gallery-grid'
import { STANDARD_HOURS } from '@/lib/orders/schedule'
import { BUSINESS, GUARANTEE } from '@/lib/public/business'
import { getGallery, getTestimonials } from '@/lib/public/content'
import { FAQ } from '@/lib/public/faq'
import { getPublicProducts } from '@/lib/public/products'
import { getStoreSettings } from '@/lib/settings'

export const revalidate = 60

const STEPS: DayStep[] = [
  {
    when: 'H-1',
    art: 'truck',
    title: 'Berangkat dari Pandaan',
    text: 'Unit dimuat ke armada kami sendiri, mobil pickup atau truk engkel, tanpa menunggu jasa angkut pihak lain.',
  },
  {
    when: 'H-1',
    art: 'ac',
    title: 'Dipasang sehari sebelumnya',
    text: 'AC standing dan misty fan dipasang di lokasi sehari sebelum acara, jadi hari acara Anda tidak terganggu pemasangan.',
  },
  {
    when: 'Hari H',
    art: 'genset',
    title: 'Daya menyala, udara sejuk',
    text: `Genset dipilih sesuai jumlah AC. Standar pemakaian ${STANDARD_HOURS} jam per hari; lebih dari itu dihitung overtime per jam.`,
  },
  {
    when: 'Selama acara',
    art: 'chat',
    title: 'Admin siaga di WhatsApp',
    text: 'Pemilik toko sendiri yang membalas chat, cepat, termasuk saat acara sedang berjalan.',
  },
  {
    when: 'Sesudah',
    art: 'return',
    title: 'Dibongkar dan dibawa pulang',
    text: 'Setelah acara selesai, tim kami membongkar dan membawa unit kembali. Anda tinggal menutup acara.',
  },
]

const AUDIENCE = [
  {
    title: 'Event organizer',
    text: 'Satu kontak untuk AC, misty fan, dan genset. Jadwal pasang H-1, dan admin bisa dihubungi selama acara.',
  },
  {
    title: 'Pabrik & korporat',
    text: 'Pendinginan sementara untuk area produksi, gudang, dan acara kantor. Pengadaan dan servis AC juga kami tangani.',
  },
  {
    title: 'Acara keluarga',
    text: 'Pernikahan, ulang tahun, syukuran. Hitung sendiri gambaran biayanya, lalu nego langsung dengan pemilik.',
  },
]

export default async function HomePage() {
  const [{ products, rules, error }, settings, gallery, testimonials] = await Promise.all([
    getPublicProducts(),
    getStoreSettings(),
    getGallery(),
    getTestimonials(),
  ])

  const featured = products.filter((p) => p.is_featured).slice(0, 3)
  const showcase = featured.length > 0 ? featured : products.filter((p) => p.category === 'rental').slice(0, 3)

  return (
    <>
      <JsonLd data={localBusinessLd(settings.wa_number)} />
      <JsonLd data={faqLd(FAQ)} />

      {/* ================= HERO ================= */}
      <section className="band-night grain overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-10 pb-16 sm:pt-14 lg:grid-cols-12 lg:gap-6 lg:pt-16 lg:pb-24">
          <div className="lg:col-span-5">
            <h1>
              <span className="block font-heading text-[2.65rem] leading-[0.98] font-semibold sm:text-6xl lg:text-[4.1rem]">
                Sejuk sebelum tamu datang.
              </span>
              <span className="mt-5 block max-w-md font-sans text-lg leading-snug font-normal tracking-normal text-white/75 sm:text-xl">
                Sewa AC standing, misty fan &amp; genset untuk acara dan industri di Jawa Timur.
              </span>
            </h1>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/estimasi"
                className="focus-ink inline-flex h-12 items-center rounded-full bg-volt px-6 font-semibold text-volt-foreground transition-transform hover:-translate-y-0.5"
              >
                Hitung estimasi
              </Link>
              <Link
                href="/kalkulator"
                className="focus-ink inline-flex h-12 items-center rounded-full border border-white/25 px-6 font-medium text-white transition-colors hover:bg-white/10"
              >
                Butuh berapa AC?
              </Link>
            </div>

            <ul className="mt-10 grid gap-3 text-sm text-white/75">
              <li className="flex items-center gap-3">
                <Truck className="size-4 shrink-0 text-frost" aria-hidden="true" /> Armada sendiri: pickup &amp; truk engkel
              </li>
              <li className="flex items-center gap-3">
                <Wrench className="size-4 shrink-0 text-frost" aria-hidden="true" /> Dipasang sehari sebelum acara
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="size-4 shrink-0 text-frost" aria-hidden="true" /> Gratis ongkir {BUSINESS.freeRadiusKm} km dari Pandaan
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7">
            <TentScene />
            <p className="mt-3 text-center text-xs text-white/50 motion-reduce:hidden">
              <span className="hidden sm:inline">Gerakkan kursor di dalam tenda untuk menambah panas.</span>
              <span className="sm:hidden">Sentuh tenda untuk menambah panas.</span> AC kami yang menurunkannya lagi.
            </p>
          </div>
        </div>
      </section>

      {/* ================= UNTUK SIAPA ================= */}
      <section aria-labelledby="untuk" className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <h2 id="untuk" className="max-w-2xl font-heading text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.08]">
          Untuk acara yang tidak boleh gerah.
        </h2>
        <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-0">
          {AUDIENCE.map((a, i) => (
            <div key={a.title} className={i > 0 ? 'sm:border-l sm:pl-8' : 'sm:pr-8'}>
              <h3 className="font-heading text-lg font-semibold">{a.title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= JAM HARI-H ================= */}
      <section aria-labelledby="hari" className="band-night grain">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <h2 id="hari" className="max-w-2xl font-heading text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.08]">
            Satu acara, dari <span className="whitespace-nowrap">H-1</span> sampai bongkar.
          </h2>
          <p className="mt-4 max-w-lg text-white/70">Begini kerja tim kami untuk setiap pesanan sewa.</p>
          <div className="mt-14">
            <DayTimeline steps={STEPS} />
          </div>
        </div>
      </section>

      {/* ================= GARANSI ================= */}
      <section aria-labelledby="garansi" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <GuaranteeStamp />
          </div>
          <div className="lg:col-span-7">
            <h2 id="garansi" className="font-heading text-3xl font-semibold sm:text-5xl sm:leading-[1.05]">
              {GUARANTEE.headline}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{GUARANTEE.body}</p>
            <p className="mt-4 text-sm text-muted-foreground">{GUARANTEE.terms}</p>
          </div>
        </div>
      </section>

      {/* ================= PRODUK ================= */}
      {showcase.length > 0 && (
        <section aria-labelledby="produk" className="border-y bg-muted/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <h2 id="produk" className="max-w-xl font-heading text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.08]">
                Yang paling sering kami antar.
              </h2>
              <Link
                href="/katalog"
                className="focus-ink inline-flex h-11 items-center rounded-full border border-input bg-card px-5 text-sm font-medium hover:bg-muted"
              >
                Lihat seluruh katalog
              </Link>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
      {error && (
        <p role="alert" className="mx-auto max-w-6xl px-4 py-6 text-sm text-destructive">
          Katalog belum dapat dimuat. Muat ulang halaman ini beberapa saat lagi.
        </p>
      )}

      {/* ================= KALKULATOR ================= */}
      <section aria-labelledby="hitung" className="band-night grain">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <h2 id="hitung" className="max-w-2xl font-heading text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.08]">
            Butuh berapa AC?
          </h2>
          <p className="mt-4 max-w-lg text-white/70">Geser sesuai acara Anda. Hasilnya langsung berubah.</p>
          <div className="mt-12">
            <NeedsCalculator rules={rules} waNumber={settings.wa_number} />
          </div>
        </div>
      </section>

      {/* ================= TESTIMONI & GALERI (tampil hanya bila sudah ada isinya) =================
          Keduanya bukti dari lapangan, jadi disatukan dalam satu band berwarna. Band ini memisahkan
          kalkulator (malam) dari FAQ (terang) supaya bagian bawah beranda tidak menjadi satu blok putih panjang. */}
      {(testimonials.length > 0 || gallery.length > 0) && (
        <section aria-label="Bukti dari pelanggan" className="border-b bg-muted/60">
          <div className="mx-auto max-w-6xl divide-y px-4">
            {testimonials.length > 0 && (
              <div className="py-16 sm:py-20">
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <h2 id="testi" className="font-heading text-3xl font-semibold sm:text-[2.6rem]">
                    Kata mereka.
                  </h2>
                  <Link href="/testimoni" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    Semua testimoni
                  </Link>
                </div>
                <div className="mt-10">
                  <TestimonialList items={testimonials.slice(0, 3)} />
                </div>
              </div>
            )}
            {gallery.length > 0 && (
              <div className="py-16 sm:py-20">
                <div className="flex flex-wrap items-end justify-between gap-5">
                  <h2 id="galeri" className="font-heading text-3xl font-semibold sm:text-[2.6rem]">
                    Dari lapangan.
                  </h2>
                  <Link href="/galeri" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    Lihat galeri
                  </Link>
                </div>
                <div className="mt-10">
                  <GalleryGrid items={gallery.slice(0, 6)} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= FAQ ================= */}
      <section aria-labelledby="faq" className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="faq" className="font-heading text-3xl font-semibold sm:text-[2.6rem] sm:leading-[1.08]">
              Yang sering ditanyakan.
            </h2>
          </div>
          <div className="lg:col-span-8">
            <FaqList items={FAQ} />
          </div>
        </div>
      </section>
    </>
  )
}

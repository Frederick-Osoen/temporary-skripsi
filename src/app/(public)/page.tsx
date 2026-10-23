import Link from 'next/link'
import { Fan, MapPin, Snowflake, Truck, Wrench, Zap } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { ProductCard } from '@/components/public/product-card'
import { ThermalGauge } from '@/components/public/thermal'
import { STANDARD_HOURS } from '@/lib/orders/schedule'
import { formatRupiah } from '@/lib/orders/utils'
import { getPublicProducts } from '@/lib/public/products'
import type { PublicProduct } from '@/lib/public/types'

export const revalidate = 60

const FREE_RADIUS_KM = 25

const minPrice = (list: PublicProduct[]) => (list.length > 0 ? Math.min(...list.map((p) => p.base_price)) : null)
const perDay = (n: number | null) => (n === null ? null : `mulai ${formatRupiah(n)} / hari`)

const STEPS = [
  {
    title: 'Pilih produk dan tanggal',
    text: 'Tambahkan AC standing, genset, atau misty fan, lalu isi tanggal acara dan jam pemakaian.',
  },
  {
    title: 'Hitung ongkir ke lokasi',
    text: 'Masukkan alamat tujuan. Jarak, BBM, dan tol pulang-pergi dari Pandaan dihitung otomatis.',
  },
  {
    title: 'Lanjutkan ke WhatsApp',
    text: 'Rincian estimasi terkirim sebagai draf pesan. Admin mengonfirmasi ketersediaan dan harga final.',
  },
]

const FAQ = [
  {
    q: 'Berapa kapasitas genset untuk sejumlah AC?',
    a: 'Di halaman estimasi, centang "Gunakan Genset" dan kapasitas kVA dihitung dari jumlah AC yang Anda pilih. Kalau kebutuhannya di luar katalog, admin membantu menentukannya lewat WhatsApp.',
  },
  {
    q: 'Apakah ongkir sudah termasuk?',
    a: `Dalam radius ${FREE_RADIUS_KM} km dari Pandaan, ongkir gratis. Di luar radius itu ongkir dihitung dari jarak, BBM, dan tol pulang-pergi. Untuk luar kota, ongkir ditentukan admin setelah konfirmasi.`,
  },
  {
    q: 'Kapan unit dipasang?',
    a: 'Unit sewa diantar dan dipasang sehari sebelum acara, supaya hari acara Anda tidak terganggu pemasangan.',
  },
  {
    q: 'Bisa ambil sendiri di toko?',
    a: 'Pengambilan di toko hanya untuk pembelian sparepart. Semua barang sewaan diantar dan dipasang oleh tim kami.',
  },
  {
    q: 'Berapa lama genset boleh dipakai per hari?',
    a: `Standarnya ${STANDARD_HOURS} jam per hari. Pemakaian lebih dari itu dihitung sebagai overtime per jam, dibulatkan ke atas.`,
  },
  {
    q: 'Apakah harga di situs ini final?',
    a: 'Belum. Angka di situs ini estimasi untuk memberi gambaran biaya. Harga final disepakati langsung dengan admin lewat WhatsApp.',
  },
]

export default async function HomePage() {
  const { products, error } = await getPublicProducts()

  const gensets = products.filter((p) => p.capacity_kva !== null)
  const fans = products.filter((p) => p.category === 'rental' && p.capacity_kva === null && /fan|misty/i.test(p.name))
  const acs = products.filter((p) => p.category === 'rental' && p.capacity_kva === null && !/fan|misty/i.test(p.name))
  const parts = products.filter((p) => p.category === 'sales')

  const rentalMin = minPrice([...acs, ...fans, ...gensets])
  const featured = products.filter((p) => p.is_featured).slice(0, 6)
  const showcase = featured.length > 0 ? featured : [...acs, ...gensets].slice(0, 3)

  const partsMin = minPrice(parts)
  const services = [
    { icon: Snowflake, title: 'Sewa AC standing', text: 'Pendingin untuk tenda acara, aula, dan area produksi. Disewa per hari.', price: perDay(minPrice(acs)) },
    { icon: Zap, title: 'Sewa genset', text: 'Beberapa kapasitas kVA. Kami bantu pilih kapasitas sesuai jumlah AC dan daya lokasi.', price: perDay(minPrice(gensets)) },
    { icon: Fan, title: 'Sewa misty fan', text: 'Kipas pengabut untuk area terbuka atau semi-terbuka.', price: perDay(minPrice(fans)) },
    { icon: Wrench, title: 'Sparepart AC', text: 'Freon, kapasitor, kompresor, dan oli genset. Bisa diambil di toko.', price: partsMin === null ? null : `mulai ${formatRupiah(partsMin)}` },
  ]

  const facts = [
    { value: `${FREE_RADIUS_KM} km`, label: `Radius gratis ongkir dari Pandaan` },
    { value: `${STANDARD_HOURS} jam`, label: 'Standar pemakaian genset per hari' },
    { value: 'H-1', label: 'Unit dipasang sehari sebelum acara' },
    rentalMin !== null
      ? { value: formatRupiah(rentalMin), label: 'Sewa termurah per hari' }
      : { value: 'Pandaan', label: 'Basis armada dan gudang kami' },
  ]

  return (
    <>
      {/* ============ Hero ============ */}
      <section className="surface-ink bg-noise">
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:py-20 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Di luar 34°.
              <br />
              Di dalam tenda 22°.
              <span className="mt-4 block text-xl leading-snug font-medium text-white/70 sm:text-2xl">
                Sewa AC standing, genset, dan misty fan di Jawa Timur.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75">
              JJ Teknik di Pandaan menyewakan pendingin dan daya untuk acara dan industri. Hitung sendiri estimasi biaya
              beserta ongkirnya, lalu lanjutkan ke WhatsApp.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/estimasi" className={buttonVariants({ variant: 'accent', className: 'h-12 px-6 text-base' })}>
                Hitung estimasi
              </Link>
              <Link
                href="/katalog"
                className="focus-ink inline-flex h-12 items-center rounded-md border border-white/25 px-6 text-base font-medium text-white transition-colors hover:bg-white/10"
              >
                Lihat katalog
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap gap-y-3 text-sm text-white/70">
              {[
                { icon: Truck, text: `Gratis ongkir radius ${FREE_RADIUS_KM} km` },
                { icon: Wrench, text: 'Diantar dan dipasang tim kami' },
                { icon: MapPin, text: 'Pandaan, Jawa Timur' },
              ].map(({ icon: Icon, text }, i) => (
                <li
                  key={text}
                  className={`flex w-full items-center gap-2 sm:w-auto ${i > 0 ? 'sm:ml-5 sm:border-l sm:border-white/15 sm:pl-5' : ''}`}
                >
                  <Icon className="size-4 shrink-0 text-frost" aria-hidden="true" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <ThermalGauge />
          </div>
        </div>
      </section>

      {/* ============ Pelat spesifikasi ============ */}
      <section aria-label="Ketentuan pokok" className="border-b bg-background">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 px-4 lg:grid-cols-4">
          {facts.map((f, i) => (
            <div
              key={f.label}
              className={`py-6 pr-4 sm:px-5 sm:py-8 ${i % 2 === 1 ? 'border-l pl-4 sm:pl-5' : ''} ${i < 2 ? 'border-b lg:border-b-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
            >
              <dt className="spec text-2xl font-bold text-ink sm:text-3xl">{f.value}</dt>
              <dd className="mt-2 max-w-[18ch] text-xs leading-relaxed text-muted-foreground sm:text-sm">{f.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ============ Layanan ============ */}
      <section aria-labelledby="layanan" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 id="layanan" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Empat hal yang kami kerjakan
          </h2>
          <p className="mt-3 text-muted-foreground">
            Semua barang sewa dihitung per hari. Sparepart dijual satuan dan bisa diambil langsung di toko.
          </p>
        </div>

        <ul className="mt-10 border-t">
          {services.map(({ icon: Icon, title, text, price }) => (
            <li key={title} className="group flex flex-col gap-3 border-b py-6 sm:flex-row sm:items-center sm:gap-6">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-primary transition-colors group-hover:bg-secondary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <h3 className="font-heading text-lg font-semibold">{title}</h3>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
              {price && <p className="tnum shrink-0 text-sm font-semibold text-ink sm:text-right">{price}</p>}
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="mt-6 text-sm text-destructive">
            Harga belum dapat dimuat. Muat ulang halaman ini beberapa saat lagi.
          </p>
        )}
      </section>

      {/* ============ Unggulan ============ */}
      {showcase.length > 0 && (
        <section aria-labelledby="unggulan" className="surface-warm border-y">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <h2 id="unggulan" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                  Paling sering disewa
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Tambahkan ke keranjang, lalu lanjutkan ke halaman estimasi untuk menghitung total dan ongkir.
                </p>
              </div>
              <Link href="/katalog" className={buttonVariants({ variant: 'outline', className: 'h-11 px-5' })}>
                Lihat seluruh katalog
              </Link>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ Cara pemesanan (urutan, jadi penomoran memang relevan) ============ */}
      <section aria-labelledby="cara" className="surface-ink bg-noise">
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 id="cara" className="font-heading max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Tiga langkah, tanpa daftar akun
          </h2>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative sm:pr-6">
                <div className="flex items-center gap-4">
                  <span className="spec text-5xl font-bold text-frost">{i + 1}</span>
                  <span className="hidden h-px flex-1 bg-white/15 sm:block" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 flex flex-wrap items-center gap-4">
            <Link href="/estimasi" className={buttonVariants({ variant: 'accent', className: 'h-12 px-6 text-base' })}>
              Mulai hitung estimasi
            </Link>
            <p className="text-sm text-white/60">Gratis, hasilnya langsung terlihat.</p>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section aria-labelledby="faq" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="faq" className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Pertanyaan yang sering masuk
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Belum terjawab? Kirim pertanyaan lewat tombol WhatsApp di atas, biasanya dibalas pada jam kerja.
            </p>
          </div>

          <div className="lg:col-span-8">
            <div className="border-t">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left">
                    <h3 className="font-heading text-base font-semibold">{f.q}</h3>
                    <span
                      className="relative size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                      aria-hidden="true"
                    >
                      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
                      <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current" />
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

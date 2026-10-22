import Link from 'next/link'
import { Fan, Snowflake, Wrench, Zap } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { FadeIn } from '@/components/public/motion'

const SERVICES = [
  { icon: Snowflake, title: 'Sewa AC Standing', text: 'Pendingin ruangan untuk acara dan kebutuhan industri, disewa per hari.' },
  { icon: Zap, title: 'Sewa Genset', text: 'Berbagai kapasitas kVA. Kami bantu merekomendasikan kapasitas sesuai jumlah AC.' },
  { icon: Fan, title: 'Sewa Misty Fan', text: 'Kipas pengabut untuk area terbuka.' },
  { icon: Wrench, title: 'Sparepart AC', text: 'Freon, kapasitor, kompresor, dan oli genset.' },
]

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero: tanpa animasi masuk agar cepat terbaca (LCP) */}
      <section className="space-y-6 py-8 text-center">
        <h1 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
          Sewa AC, Genset &amp; Sparepart AC di Jawa Timur
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          JJ Teknik berbasis di Pandaan. Hitung estimasi biaya sewa dan ongkir kirim secara transparan, lalu lanjutkan negosiasi langsung lewat WhatsApp.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/estimasi" className={buttonVariants({ size: 'lg' })}>Hitung Estimasi</Link>
          <Link href="/katalog" className={buttonVariants({ size: 'lg', variant: 'outline' })}>Lihat Katalog</Link>
        </div>
      </section>

      <FadeIn>
        <section aria-labelledby="layanan" className="space-y-6">
          <h2 id="layanan" className="text-2xl font-semibold">Layanan Kami</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="space-y-2 rounded-lg border bg-background p-4">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      <FadeIn>
        <section aria-labelledby="cara" className="space-y-6">
          <h2 id="cara" className="text-2xl font-semibold">Cara Pemesanan</h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {['Pilih produk dan isi tanggal serta lokasi di halaman estimasi.', 'Lihat rincian biaya sewa dan ongkir secara langsung.', 'Kirim draf pesanan ke admin via WhatsApp untuk konfirmasi dan negosiasi.'].map((t, i) => (
              <li key={t} className="flex gap-3 rounded-lg border bg-background p-4 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </section>
      </FadeIn>
    </div>
  )
}
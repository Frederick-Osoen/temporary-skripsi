import type { Metadata } from 'next'
import Link from 'next/link'
import { NeedsCalculator } from '@/components/public/needs-calculator'
import { getPublicProducts } from '@/lib/public/products'
import { getStoreSettings } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Kalkulator Kebutuhan AC & Genset',
  description: 'Perkirakan jumlah AC standing dan kapasitas genset untuk tenda, ruangan, atau gudang dari luas area dan jumlah tamu.',
}
export const revalidate = 60

export default async function CalculatorPage() {
  const [{ rules }, settings] = await Promise.all([getPublicProducts(), getStoreSettings()])
  return (
    <section className="band-night grain">
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:pt-20 sm:pb-28">
        <h1 className="max-w-3xl font-heading text-4xl leading-[1.02] font-semibold sm:text-6xl">Butuh berapa AC?</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/70">
          Pilih jenis tempat, lalu geser luas dan jumlah tamu. Hasilnya perkiraan awal sebelum Anda{' '}
          <Link href="/estimasi" className="text-frost underline underline-offset-4">
            menghitung biaya
          </Link>
          .
        </p>
        <div className="mt-12">
          <NeedsCalculator rules={rules} waNumber={settings.wa_number} />
        </div>
      </div>
    </section>
  )
}

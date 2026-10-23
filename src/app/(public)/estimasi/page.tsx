import type { Metadata } from 'next'
import { z } from 'zod'
import { Estimator } from '@/components/public/estimator'
import { PageHero } from '@/components/public/page-hero'
import { getStoreSettings } from '@/lib/settings'
import { getPublicProducts } from '@/lib/public/products'

export const metadata: Metadata = {
  title: 'Estimasi Biaya',
  description: 'Hitung estimasi biaya sewa AC dan genset beserta ongkir, lalu lanjutkan via WhatsApp.',
}

const uuid = z.string().uuid()

export default async function EstimatePage({ searchParams }: { searchParams: Promise<{ add?: string | string[] }> }) {
  const { add } = await searchParams
  const initialAdd = (Array.isArray(add) ? add : add ? [add] : []).filter((v) => uuid.safeParse(v).success).slice(0, 10)
  const [{ products, rules, error }, settings] = await Promise.all([getPublicProducts(), getStoreSettings()])

  return (
    <>
      <PageHero
        title="Estimasi biaya."
        lead="Tanpa daftar akun dan tanpa pembayaran di situs. Isi empat langkah, lalu kirim rinciannya ke admin lewat WhatsApp."
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        {error ? (
          <div className="py-16">
            <p role="alert" className="font-heading text-lg font-semibold">
              Data produk belum dapat dimuat
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Muat ulang halaman ini beberapa saat lagi.</p>
          </div>
        ) : (
          <Estimator products={products} rules={rules} initialAdd={initialAdd} waNumber={settings.wa_number} />
        )}
      </div>
    </>
  )
}

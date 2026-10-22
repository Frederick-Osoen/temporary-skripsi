import type { Metadata } from 'next'
import { z } from 'zod'
import { Estimator } from '@/components/public/estimator'
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
      <div className="border-b bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Estimasi biaya</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Tanpa daftar akun dan tanpa pembayaran di situs. Isi empat langkah di bawah, lalu kirim rinciannya ke admin lewat
            WhatsApp.
          </p>
        </div>
      </div>

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

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
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Estimasi Biaya</h1>
        <p className="text-muted-foreground">Tanpa daftar akun. Hasilnya berupa estimasi, harga final disepakati lewat WhatsApp.</p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">Data produk belum dapat dimuat. Coba beberapa saat lagi.</p>
      ) : (
        <Estimator products={products} rules={rules} initialAdd={initialAdd} waNumber={settings.wa_number} />
      )}
    </div>
  )
}
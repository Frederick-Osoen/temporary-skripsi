import type { Metadata } from 'next'
import { CatalogBrowser } from '@/components/public/catalog-browser'
import { PageHero } from '@/components/public/page-hero'
import { getPublicProducts } from '@/lib/public/products'

export const metadata: Metadata = {
  title: 'Katalog',
  description: 'Katalog sewa AC Standing, misty fan, genset, dan penjualan sparepart AC di Pandaan, Jawa Timur.',
}
export const revalidate = 60

export default async function CatalogPage() {
  const { products, error } = await getPublicProducts()

  return (
    <>
      <PageHero
        title="Katalog."
        lead="Barang sewa dihitung per hari, sparepart dijual satuan. Tambahkan ke keranjang, lalu hitung total dan ongkir di halaman estimasi."
      />

      {error ? (
        <div className="mx-auto max-w-6xl px-4 py-24">
          <p role="alert" className="font-heading text-lg font-semibold">
            Katalog belum dapat dimuat
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Muat ulang halaman ini beberapa saat lagi.</p>
        </div>
      ) : (
        <CatalogBrowser products={products} />
      )}
    </>
  )
}

import type { Metadata } from 'next'
import { CatalogBrowser } from '@/components/public/catalog-browser'
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
      <div className="border-b bg-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="font-heading max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Katalog</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Barang sewa dihitung per hari, sparepart dijual satuan. Tambahkan ke keranjang, lalu hitung total dan ongkir di
            halaman estimasi.
          </p>
        </div>
      </div>

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

import type { Metadata } from 'next'
import { FadeIn } from '@/components/public/motion'
import { ProductCard } from '@/components/public/product-card'
import { getPublicProducts } from '@/lib/public/products'
import type { PublicProduct } from '@/lib/public/types'

export const metadata: Metadata = {
  title: 'Katalog',
  description: 'Katalog sewa AC Standing, misty fan, genset, dan penjualan sparepart AC.',
}
export const revalidate = 60

function Group({ id, title, items }: { id: string; title: string; items: PublicProduct[] }) {
  if (items.length === 0) return null
  return (
    <FadeIn>
      <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 space-y-4">
        <h2 id={`${id}-h`} className="text-xl font-semibold">{title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </FadeIn>
  )
}

export default async function CatalogPage() {
  const { products, error } = await getPublicProducts()

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Katalog</h1>
        <p className="text-muted-foreground">Harga sewa per hari. Pilih produk lalu hitung estimasi biaya lengkap dengan ongkir.</p>
        <nav aria-label="Lompat ke bagian" className="flex flex-wrap gap-2 pt-2 text-sm">
          {[['#sewa', 'Sewa AC & Pendingin'], ['#genset', 'Sewa Genset'], ['#jual', 'Penjualan']].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border px-3 py-1 hover:bg-muted">{label}</a>
          ))}
        </nav>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">Katalog belum dapat dimuat. Coba beberapa saat lagi.</p>
      ) : (
        <>
          <Group id="sewa" title="Sewa AC & Pendingin" items={products.filter((p) => p.category === 'rental' && p.capacity_kva === null)} />
          <Group id="genset" title="Sewa Genset" items={products.filter((p) => p.capacity_kva !== null)} />
          <Group id="jual" title="Penjualan Sparepart" items={products.filter((p) => p.category === 'sales')} />
        </>
      )}
    </div>
  )
}
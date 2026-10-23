'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { isAcProduct } from '@/lib/maintenance'
import { formatRupiah } from '@/lib/orders/utils'
import { STANDARD_HOURS } from '@/lib/orders/schedule'
import { productImageUrl } from '@/lib/storage'
import type { PublicProduct } from '@/lib/public/types'
import { useCart } from '@/lib/public/cart'
import { AcArt, FanArt, GensetArt, PartArt } from './line-icons'

// Ilustrasi garis sebagai pengganti foto: kartu tetap rapi walau foto belum diunggah admin.
function ProductArt({ product: p }: { product: PublicProduct }) {
  if (p.capacity_kva !== null) return <GensetArt />
  if (/fan|misty/i.test(p.name)) return <FanArt />
  if (isAcProduct(p.name) || p.category === 'rental') return <AcArt />
  return <PartArt />
}

export function ProductCard({ product: p }: { product: PublicProduct }) {
  const { items, add, setQty, remove } = useCart()
  const inCart = items.find((i) => i.id === p.id)

  const rental = p.category === 'rental'
  const description = p.description ?? (rental ? 'Disewakan per hari, diantar dan dipasang tim kami.' : 'Suku cadang dan perlengkapan pendingin.')
  const imageUrl = productImageUrl(p.image_path)

  return (
    <article className="group panel flex flex-col overflow-hidden rounded-2xl transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float focus-within:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-ink">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={p.name}
            fill
            sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="band-night art-static flex h-full items-center justify-center p-10 text-frost/75">
            <ProductArt product={p} />
          </div>
        )}

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {p.is_featured ? (
            <span className="rounded-full bg-volt px-2.5 py-1 text-[11px] font-semibold text-volt-foreground">Sering disewa</span>
          ) : (
            <span />
          )}
          {p.capacity_kva !== null && (
            <span className="tnum rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {p.capacity_kva} kVA
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-[17px] leading-snug font-semibold tracking-tight">{p.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

        <div className="mt-auto pt-5">
          <p className="flex items-baseline gap-1.5">
            <span className="num text-2xl font-semibold text-ink">{formatRupiah(p.base_price)}</span>
            {rental && <span className="text-sm text-muted-foreground">/ hari</span>}
          </p>
          {p.capacity_kva !== null && p.overtime_rate !== null && (
            <p className="tnum mt-1 text-xs text-muted-foreground">
              Lebih dari {STANDARD_HOURS} jam/hari: +{formatRupiah(p.overtime_rate)}/jam
            </p>
          )}

          <div className="mt-4">
            {inCart ? (
              <div className="flex h-11 items-center justify-between rounded-full bg-ink p-1 text-white">
                <button
                  type="button"
                  className="focus-ink flex size-9 items-center justify-center rounded-full hover:bg-white/10"
                  aria-label={inCart.qty <= 1 ? `Hapus ${p.name} dari keranjang` : `Kurangi jumlah ${p.name}`}
                  onClick={() => (inCart.qty <= 1 ? remove(p.id) : setQty(p.id, inCart.qty - 1))}
                >
                  {inCart.qty <= 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                </button>
                <span className="tnum text-sm font-semibold" aria-live="polite">
                  {inCart.qty} di keranjang
                </span>
                <button
                  type="button"
                  className="focus-ink flex size-9 items-center justify-center rounded-full hover:bg-white/10"
                  aria-label={`Tambah jumlah ${p.name}`}
                  onClick={() => setQty(p.id, inCart.qty + 1)}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => add(p.id)}
                className="focus-ink flex h-11 w-full items-center justify-center gap-2 rounded-full border border-input text-sm font-medium transition-colors hover:border-ink hover:bg-ink hover:text-white"
              >
                <Plus className="size-4" aria-hidden="true" /> Tambah ke keranjang
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

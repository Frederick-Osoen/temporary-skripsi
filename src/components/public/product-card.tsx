'use client'

import Image from 'next/image'
import { Fan, Minus, Package, Plus, Snowflake, Trash2, Wrench, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isAcProduct } from '@/lib/maintenance'
import { formatRupiah } from '@/lib/orders/utils'
import { STANDARD_HOURS } from '@/lib/orders/schedule'
import { productImageUrl } from '@/lib/storage'
import type { PublicProduct } from '@/lib/public/types'
import { useCart } from '@/lib/public/cart'

// Komponen ikon terpisah (lint React melarang membuat komponen dinamis di dalam render)
function ProductIcon({ product: p }: { product: PublicProduct }) {
  const cls = 'size-10 text-muted-foreground/50'
  if (p.capacity_kva !== null) return <Zap className={cls} aria-hidden="true" />
  if (/fan|misty/i.test(p.name)) return <Fan className={cls} aria-hidden="true" />
  if (isAcProduct(p.name)) return <Snowflake className={cls} aria-hidden="true" />
  return p.category === 'sales' ? <Wrench className={cls} aria-hidden="true" /> : <Package className={cls} aria-hidden="true" />
}

export function ProductCard({ product: p }: { product: PublicProduct }) {
  const { items, add, setQty, remove } = useCart()
  const inCart = items.find((i) => i.id === p.id)

  const rental = p.category === 'rental'
  const description = p.description ?? (rental ? 'Tersedia untuk disewa per hari.' : 'Suku cadang dan perlengkapan.')
  const imageUrl = productImageUrl(p.image_path)

  return (
    <article className="group panel flex flex-col overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-soft focus-within:border-primary/35">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={p.name}
            fill
            sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ProductIcon product={p} />
          </div>
        )}

        {p.is_featured && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-volt px-2.5 py-1 text-[11px] font-semibold text-volt-foreground shadow-sm">
            Sering disewa
          </span>
        )}
        {p.capacity_kva !== null && (
          <span className="tnum absolute top-3 right-3 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {p.capacity_kva} kVA
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-heading text-base leading-snug font-semibold">{p.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{description}</p>

        <div className="mt-4 flex items-baseline gap-1 border-t pt-4">
          <span className="spec text-2xl font-bold text-ink">{formatRupiah(p.base_price)}</span>
          {rental && <span className="text-sm text-muted-foreground">/ hari</span>}
        </div>

        {p.capacity_kva !== null && p.overtime_rate !== null && (
          <p className="tnum mt-1.5 text-xs text-muted-foreground">
            Di atas {STANDARD_HOURS} jam/hari: overtime {formatRupiah(p.overtime_rate)}/jam
          </p>
        )}

        <div className="mt-4 pt-0">
          {inCart ? (
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={inCart.qty <= 1 ? `Hapus ${p.name} dari keranjang` : `Kurangi jumlah ${p.name}`}
                onClick={() => (inCart.qty <= 1 ? remove(p.id) : setQty(p.id, inCart.qty - 1))}
              >
                {inCart.qty <= 1 ? <Trash2 className="size-4 text-destructive" /> : <Minus className="size-4" />}
              </Button>
              <span className="tnum text-sm font-semibold">{inCart.qty} di keranjang</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Tambah jumlah ${p.name}`}
                onClick={() => setQty(p.id, inCart.qty + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" className="h-10 w-full" onClick={() => add(p.id)}>
              <Plus className="size-4" /> Tambah ke keranjang
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

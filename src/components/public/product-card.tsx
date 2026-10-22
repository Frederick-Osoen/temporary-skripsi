'use client'

import { Fan, Package, Snowflake, Wrench, Zap, Minus, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isAcProduct } from '@/lib/maintenance'
import { formatRupiah } from '@/lib/orders/utils'
import { STANDARD_HOURS } from '@/lib/orders/schedule'
import type { PublicProduct } from '@/lib/public/types'
import { useCart } from '@/lib/public/cart'

function pickIcon(p: PublicProduct) {
  if (p.capacity_kva !== null) return Zap
  if (isAcProduct(p.name)) return Snowflake
  if (/fan/i.test(p.name)) return Fan
  return p.category === 'sales' ? Wrench : Package
}

export function ProductCard({ product: p }: { product: PublicProduct }) {
  // Mengambil data keranjang
  const { items, add, setQty } = useCart()
  const inCart = items.find((i) => i.id === p.id)

  const Icon = pickIcon(p)
  const rental = p.category === 'rental'
  const description = p.description ?? (rental ? 'Tersedia untuk disewa per hari.' : 'Suku cadang dan perlengkapan.')

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border bg-background">
      {/* Placeholder abu-abu; foto asli menyusul lewat kolom image_path */}
      <div className="flex aspect-[4/3] items-center justify-center bg-muted" aria-hidden="true">
        <Icon className="h-10 w-10 text-muted-foreground/60" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{p.name}</h3>
          {p.capacity_kva !== null && <Badge variant="secondary">{p.capacity_kva} kVA</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-auto space-y-1 pt-2">
          <p className="text-lg font-bold">
            {formatRupiah(p.base_price)}
            {rental && <span className="text-sm font-normal text-muted-foreground"> / hari</span>}
          </p>
          {p.capacity_kva !== null && p.overtime_rate !== null && (
            <p className="text-xs text-muted-foreground">
              Pemakaian lebih dari {STANDARD_HOURS} jam/hari: overtime {formatRupiah(p.overtime_rate)}/jam.
            </p>
          )}
          
          {/* Ini adalah bagian JSX baru pengganti Link */}
          <div className="mt-2">
            {inCart ? (
              <div className="flex items-center justify-between rounded-md border px-1 py-0.5">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                  aria-label="Kurangi" onClick={() => setQty(p.id, inCart.qty - 1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium tabular-nums">{inCart.qty}</span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                  aria-label="Tambah" onClick={() => setQty(p.id, inCart.qty + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => add(p.id)}>
                Tambah ke keranjang
              </Button>
            )}
          </div>
          
        </div>
      </div>
    </article>
  )
}
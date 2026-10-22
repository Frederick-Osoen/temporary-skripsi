'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { ProductCard } from '@/components/public/product-card'
import { STANDARD_HOURS } from '@/lib/orders/schedule'
import { cn } from '@/lib/utils'
import type { PublicProduct } from '@/lib/public/types'

type GroupId = 'sewa' | 'genset' | 'jual'

const GROUPS: { id: GroupId; title: string; note: string; match: (p: PublicProduct) => boolean }[] = [
  {
    id: 'sewa',
    title: 'Sewa AC & pendingin',
    note: 'Harga per hari. Diantar dan dipasang tim kami.',
    match: (p) => p.category === 'rental' && p.capacity_kva === null,
  },
  {
    id: 'genset',
    title: 'Sewa genset',
    note: `Harga per hari. Standar pemakaian ${STANDARD_HOURS} jam, lebihnya dihitung overtime.`,
    match: (p) => p.capacity_kva !== null,
  },
  {
    id: 'jual',
    title: 'Sparepart AC',
    note: 'Dijual satuan. Bisa diambil langsung di toko Pandaan.',
    match: (p) => p.category === 'sales',
  },
]

const FILTERS: { value: 'all' | GroupId; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'sewa', label: 'AC & pendingin' },
  { value: 'genset', label: 'Genset' },
  { value: 'jual', label: 'Sparepart' },
]

export function CatalogBrowser({ products }: { products: PublicProduct[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | GroupId>('all')

  const term = query.trim().toLowerCase()

  const groups = useMemo(
    () =>
      GROUPS.filter((g) => filter === 'all' || g.id === filter).map((g) => ({
        ...g,
        items: products.filter(
          (p) => g.match(p) && (term === '' || p.name.toLowerCase().includes(term) || (p.description ?? '').toLowerCase().includes(term))
        ),
      })),
    [products, filter, term]
  )

  const total = groups.reduce((s, g) => s + g.items.length, 0)

  return (
    <>
      <div className="sticky top-16 z-30 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
          <div className="relative lg:max-w-xs lg:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari produk, misal: genset 10"
              aria-label="Cari produk"
              className="h-10 w-full rounded-md border border-input bg-background pr-9 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Hapus pencarian"
                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 lg:ml-auto lg:overflow-visible">
            {FILTERS.map((f) => {
              const active = filter === f.value
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  aria-pressed={active}
                  className={cn(
                    'h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors',
                    active
                      ? 'border-ink bg-ink text-white'
                      : 'border-border text-muted-foreground hover:border-input hover:text-foreground'
                  )}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20">
        {total === 0 ? (
          <div className="py-24 text-center">
            <p className="font-heading text-lg font-semibold">Tidak ada produk yang cocok</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Coba kata kunci lain{term && <> selain &ldquo;{query.trim()}&rdquo;</>}, atau tampilkan seluruh katalog.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setFilter('all')
              }}
              className="mt-5 h-10 rounded-md border border-input px-5 text-sm font-medium hover:bg-muted"
            >
              Tampilkan semua
            </button>
          </div>
        ) : (
          groups.map((g) =>
            g.items.length === 0 ? null : (
              <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-32 pt-14">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b pb-4">
                  <h2 id={`${g.id}-h`} className="font-heading text-2xl font-bold tracking-tight">
                    {g.title}
                  </h2>
                  <p className="tnum text-sm text-muted-foreground">{g.items.length} produk</p>
                </div>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">{g.note}</p>

                <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )
          )
        )}
      </div>
    </>
  )
}

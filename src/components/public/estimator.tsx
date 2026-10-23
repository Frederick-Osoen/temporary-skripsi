'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Info, MessageCircle, Minus, Plus, Search, Trash2, Truck, Store } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STANDARD_HOURS } from '@/lib/orders/schedule'
import { formatRupiah, lineSubtotal } from '@/lib/orders/utils'
import { fleetPlanLabel } from '@/lib/public/fleet'
import { MAX_QTY, useEstimator, type EstimatorProps } from '@/lib/public/use-estimator'
import { cn } from '@/lib/utils'
import { PlaceInput } from './place-input'

const STEP_LABELS = ['Produk', 'Jadwal', 'Pengiriman', 'Kirim']

function Panel({
  step,
  title,
  hint,
  children,
}: {
  step: number
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={`langkah-${step}`} className="panel overflow-hidden">
      <header className="flex items-start gap-3 border-b bg-muted/40 px-4 py-3.5 sm:px-5">
        <span className="num mt-0.5 text-sm font-bold text-primary">{step}</span>
        <div>
          <h2 id={`langkah-${step}`} className="font-heading text-base font-semibold">
            {title}
          </h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </header>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  )
}

export function Estimator(props: EstimatorProps) {
  const {
    cartReady, rows, addProduct, setQty, removeLine,
    rentalProducts, rentalGensets, salesProducts,
    acCount, hasManualGenset, useGenset, setUseGenset, gensetActive, recKva, autoProduct, autoMissing, customKva,
    today, startDate, setStartDate, endDate, setEndDate, startTime, setStartTime, endTime, setEndTime, datesOk, timeError,
    delivery, setDeliveryChoice, destination, changeDestination, pickDestination, calculate, shipping, plan,
    hasRental, hasSales, hasGenset, result, issues, ready, draft, recordLead,
    name, setName,
  } = useEstimator(props)

  // State khusus tampilan: pencarian di daftar produk (tidak menyentuh logika estimasi)
  const [search, setSearch] = useState('')

  if (!cartReady) {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-44" />
          ))}
        </div>
        <div className="lg:col-span-5">
          <div className="skeleton h-72" />
        </div>
      </div>
    )
  }

  const q = search.trim().toLowerCase()
  const addedIds = new Set(rows.filter((r) => !r.auto).map((r) => r.product.id))
  const catalog = [
    { label: 'Sewa AC & pendingin', items: rentalProducts },
    { label: 'Sewa genset', items: rentalGensets },
    { label: 'Penjualan sparepart', items: salesProducts },
  ]
    .map((g) => ({ ...g, items: g.items.filter((p) => q === '' || p.name.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length > 0)

  // Hanya untuk penanda kemajuan (tampilan); kesiapan sebenarnya tetap dari `ready`
  const done = [
    rows.length > 0,
    rows.length > 0 && datesOk && !timeError && (!hasGenset || (startTime !== '' && endTime !== '')),
    rows.length > 0 && (delivery === 'store_pickup' || shipping.status === 'ok' || shipping.status === 'unavailable'),
    ready && !timeError,
  ]

  const waButton = (className: string) =>
    draft && !timeError ? (
      <a
        href={draft.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={recordLead}
        className={buttonVariants({ variant: 'accent', className })}
      >
        <MessageCircle className="size-4" /> Lanjutkan via WhatsApp
      </a>
    ) : (
      <Button type="button" variant="accent" className={className} disabled>
        <MessageCircle className="size-4" /> Lanjutkan via WhatsApp
      </Button>
    )

  return (
    <div className="pb-28 lg:pb-0">
      {/* Penanda kemajuan */}
      <ol className="mb-8 flex items-center gap-2 sm:gap-3">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                done[i] ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'
              )}
              aria-hidden="true"
            >
              {done[i] ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn('truncate text-xs font-medium sm:text-sm', done[i] ? 'text-foreground' : 'text-muted-foreground')}>
              {label}
              <span className="sr-only">{done[i] ? ' selesai' : ' belum selesai'}</span>
            </span>
            {i < STEP_LABELS.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {/* ---------- 1. Produk ---------- */}
          <Panel step={1} title="Pilih produk" hint="Barang sewa dihitung per hari, sparepart per unit.">
            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Belum ada produk dipilih. Tambahkan dari daftar di bawah, atau{' '}
                <Link href="/katalog" className="text-primary underline underline-offset-2">
                  buka katalog
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2">
                {rows.map(({ product: p, qty, auto }) => {
                  const rental = p.category === 'rental'
                  const sub = lineSubtotal({ qty, unit_price: p.base_price, is_rental: rental }, result.days)
                  return (
                    <li key={`${p.id}:${auto ? 'auto' : 'manual'}`} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{p.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {p.capacity_kva !== null && <Badge variant="secondary">{p.capacity_kva} kVA</Badge>}
                            <Badge variant="outline">{rental ? 'sewa' : 'beli'}</Badge>
                            {auto && <Badge variant="outline">Rekomendasi sistem</Badge>}
                          </div>
                        </div>
                        {!auto && (
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus ${p.name}`} onClick={() => removeLine(p.id)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        {auto ? (
                          <span className="text-sm text-muted-foreground">1 unit</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="outline" size="icon-sm" aria-label="Kurangi" onClick={() => setQty(p.id, qty - 1)} disabled={qty <= 1}>
                              <Minus className="size-4" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={MAX_QTY}
                              step={1}
                              inputMode="numeric"
                              className="tnum h-8 w-16 text-center"
                              aria-label={`Jumlah ${p.name}`}
                              value={qty}
                              onChange={(e) => setQty(p.id, Number(e.target.value))}
                            />
                            <Button type="button" variant="outline" size="icon-sm" aria-label="Tambah" onClick={() => setQty(p.id, qty + 1)} disabled={qty >= MAX_QTY}>
                              <Plus className="size-4" />
                            </Button>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="tnum font-semibold">{formatRupiah(sub)}</p>
                          <p className="tnum text-xs text-muted-foreground">
                            {qty} × {formatRupiah(p.base_price)}
                            {rental && result.days > 1 ? ` × ${result.days} hari` : ''}
                          </p>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Daftar produk yang bisa ditambahkan */}
            <div className="rounded-lg border">
              <div className="relative border-b">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari produk untuk ditambahkan"
                  aria-label="Cari produk untuk ditambahkan"
                  className="h-11 w-full rounded-t-lg bg-transparent pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
              </div>

              <div className="max-h-72 overflow-y-auto">
                {catalog.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">Tidak ada produk yang cocok.</p>
                ) : (
                  catalog.map((g) => (
                    <div key={g.label}>
                      <p className="bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">{g.label}</p>
                      <ul>
                        {g.items.map((p) => {
                          const added = addedIds.has(p.id)
                          return (
                            <li key={p.id} className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{p.name}</p>
                                <p className="tnum text-xs text-muted-foreground">
                                  {formatRupiah(p.base_price)}
                                  {p.category === 'rental' ? ' / hari' : ''}
                                </p>
                              </div>
                              {added ? (
                                <span className="flex items-center gap-1 pr-1 text-xs font-medium text-primary">
                                  <Check className="size-4" aria-hidden="true" /> Dipilih
                                </span>
                              ) : (
                                <Button type="button" variant="outline" size="sm" onClick={() => addProduct(p.id)} aria-label={`Tambah ${p.name}`}>
                                  <Plus className="size-4" /> Tambah
                                </Button>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Helper genset */}
            {acCount > 0 && !hasManualGenset && (
              <div className="space-y-2 rounded-lg border border-volt/30 bg-volt/5 p-3.5">
                <label className="flex items-start gap-2.5 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={useGenset}
                    onChange={(e) => setUseGenset(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-input"
                  />
                  <span>
                    Sekalian sewa genset
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      Kapasitas kVA dihitung otomatis dari {acCount} unit AC yang Anda pilih.
                    </span>
                  </span>
                </label>
                {gensetActive && recKva !== null && autoProduct && (
                  <p className="tnum text-xs text-muted-foreground">
                    Rekomendasi untuk {acCount} unit AC: {recKva} kVA. Butuh kapasitas lain? Tambahkan genset sendiri dari
                    daftar produk.
                  </p>
                )}
                {gensetActive && autoMissing && (
                  <p className="text-xs text-warning">
                    Kebutuhan {recKva} kVA belum tersedia di katalog online. Admin akan membantu lewat WhatsApp.
                  </p>
                )}
                {customKva && (
                  <p className="text-xs text-warning">
                    Lebih dari 20 unit AC membutuhkan <strong>kapasitas genset custom</strong>. Konsultasikan lewat WhatsApp.
                  </p>
                )}
              </div>
            )}
          </Panel>

          {/* ---------- 2. Jadwal ---------- */}
          <Panel step={2} title="Tanggal & jam" hint={hasRental ? 'Durasi sewa dihitung inklusif, hari pertama ikut dihitung.' : undefined}>
            <div className={cn('grid gap-4', hasRental ? 'sm:grid-cols-2' : 'sm:max-w-xs')}>
              <div className="space-y-2">
                <Label htmlFor="start_date">{hasRental ? 'Tanggal mulai acara' : 'Tanggal pengiriman / pengambilan'}</Label>
                <Input
                  id="start_date"
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (!endDate || endDate < e.target.value) setEndDate(e.target.value)
                  }}
                />
              </div>
              {hasRental && (
                <div className="space-y-2">
                  <Label htmlFor="end_date">Tanggal selesai</Label>
                  <Input id="end_date" type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              )}
            </div>

            {hasRental && datesOk && (
              <p className="flex items-baseline gap-2 rounded-lg bg-muted/50 px-3.5 py-3">
                <span className="num text-2xl font-bold text-ink">{result.days}</span>
                <span className="text-sm text-muted-foreground">hari sewa</span>
              </p>
            )}

            {hasGenset && (
              <div className="space-y-2.5 border-t pt-4">
                <div className="grid max-w-sm grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">
                      Jam mulai <span className="text-destructive">*</span>
                    </Label>
                    <Input id="start_time" type="time" value={startTime} required onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">
                      Jam selesai <span className="text-destructive">*</span>
                    </Label>
                    <Input id="end_time" type="time" value={endTime} required onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Jam ini dianggap sama setiap hari. Standar pemakaian genset {STANDARD_HOURS} jam per hari; lebih dari itu
                  dikenai overtime per jam, dibulatkan ke atas.
                </p>
                {timeError && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    {timeError}
                  </p>
                )}
              </div>
            )}
          </Panel>

          {/* ---------- 3. Pengiriman ---------- */}
          <Panel step={3} title="Pengiriman" hint={hasRental ? 'Barang sewaan selalu diantar dan dipasang di lokasi.' : undefined}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors',
                  delivery === 'delivery' ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                )}
              >
                <input
                  type="radio"
                  name="delivery"
                  className="mt-0.5 size-4"
                  checked={delivery === 'delivery'}
                  onChange={() => setDeliveryChoice('delivery')}
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Truck className="size-4 text-primary" aria-hidden="true" /> Diantar ke lokasi
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Ongkir dihitung dari jarak, BBM, dan tol.</span>
                </span>
              </label>

              <label
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3.5 transition-colors',
                  hasRental ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
                  delivery === 'store_pickup' ? 'border-primary bg-primary/5' : !hasRental && 'hover:bg-muted/40'
                )}
              >
                <input
                  type="radio"
                  name="delivery"
                  className="mt-0.5 size-4"
                  disabled={hasRental}
                  checked={delivery === 'store_pickup'}
                  onChange={() => setDeliveryChoice('store_pickup')}
                />
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Store className="size-4" aria-hidden="true" /> Ambil di toko
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {hasRental ? 'Tidak tersedia karena ada barang sewaan.' : 'Khusus pembelian sparepart.'}
                  </span>
                </span>
              </label>
            </div>

            {hasRental && hasSales && (
              <p className="flex items-start gap-2 rounded-lg border border-volt/40 bg-volt/10 px-3.5 py-3 text-xs leading-relaxed text-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
                Barang pembelian akan dikirimkan bersamaan dengan armada barang sewaan.
              </p>
            )}

            {delivery === 'delivery' && (
              <div className="space-y-3 border-t pt-4">
                <div className="space-y-2">
                  <Label htmlFor="destination">Alamat tujuan</Label>
                  <PlaceInput id="destination" value={destination} onChange={changeDestination} onPick={pickDestination} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={shipping.status === 'loading' || destination.trim().length < 3}
                  onClick={() => void calculate(destination)}
                >
                  {shipping.status === 'loading' ? 'Menghitung ongkir...' : 'Hitung ongkir'}
                </Button>

                {shipping.status === 'error' && (
                  <p role="alert" className="rounded-lg bg-volt/10 px-3.5 py-3 text-sm text-foreground">
                    {shipping.message}
                  </p>
                )}
                {shipping.status === 'unavailable' && (
                  <p role="status" className="rounded-lg bg-volt/10 px-3.5 py-3 text-sm text-foreground">
                    Layanan peta sedang bermasalah. Anda tetap bisa melanjutkan, ongkir akan dihitung admin.
                  </p>
                )}
                {shipping.status === 'ok' && (
                  <div className="rounded-lg border bg-muted/40 p-3.5">
                    <div className="flex flex-wrap gap-x-8 gap-y-3">
                      <div>
                        <p className="num text-xl font-bold text-ink">± {shipping.distance_km} km</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Jarak dari Pandaan</p>
                      </div>
                      <div>
                        <p className="font-heading text-xl font-bold text-ink">{fleetPlanLabel(plan)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Armada yang dibutuhkan</p>
                      </div>
                      {shipping.zone === 2 && result.shippingFee !== null && (
                        <div>
                          <p className="num text-xl font-bold text-ink">{formatRupiah(result.shippingFee)}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Ongkir pulang-pergi</p>
                        </div>
                      )}
                    </div>

                    {shipping.zone === 1 && (
                      <p className="mt-3 border-t pt-3 text-sm font-medium text-success">Gratis ongkir, masih dalam radius 25 km.</p>
                    )}
                    {shipping.zone === 3 && (
                      <p className="mt-3 border-t pt-3 text-sm text-warning">Luar kota: ongkir ditentukan admin setelah konfirmasi.</p>
                    )}
                    {shipping.reviewToll && shipping.zone === 2 && (
                      <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                        Biaya tol dapat berbeda dan akan dikonfirmasi admin.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Panel>

          {/* ---------- 4. Nama ---------- */}
          <Panel step={4} title="Nama Anda" hint="Opsional. Membantu admin mengenali pesanan saat Anda chat.">
            <div className="max-w-sm space-y-2">
              <Label htmlFor="cust_name">Nama atau nama perusahaan</Label>
              <Input id="cust_name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Misal: Budi / CV Sejahtera" />
            </div>
          </Panel>
        </div>

        {/* ---------- Ringkasan ---------- */}
        <aside className="lg:col-span-5">
          <div className="panel overflow-hidden lg:sticky lg:top-24">
            <h2 className="border-b bg-muted/40 px-4 py-3.5 font-heading text-base font-semibold sm:px-5">Ringkasan estimasi</h2>

            <div className="space-y-3 p-4 sm:p-5">
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{result.hasRental ? `Sewa ${result.days} hari` : 'Produk'}</dt>
                  <dd className="tnum font-medium">{formatRupiah(result.itemsTotal)}</dd>
                </div>
                {delivery === 'delivery' && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Ongkir</dt>
                    <dd className={cn('tnum font-medium', result.shippingPending && 'text-xs text-muted-foreground')}>
                      {result.shippingPending ? 'dihitung admin' : formatRupiah(result.shippingFee ?? 0)}
                    </dd>
                  </div>
                )}
                {result.overtimeFee > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Overtime genset</dt>
                    <dd className="tnum font-medium">{formatRupiah(result.overtimeFee)}</dd>
                  </div>
                )}
              </dl>

              <div className="flex items-end justify-between gap-4 border-t border-dashed pt-4">
                <span className="text-sm font-medium">Perkiraan total</span>
                <span className="text-right">
                  <span className="num block text-3xl font-bold text-ink">{formatRupiah(result.total)}</span>
                  {result.shippingPending && <span className="text-xs text-muted-foreground">belum termasuk ongkir</span>}
                </span>
              </div>

              {result.overtimeUnpriced && <p className="text-xs text-warning">Tarif overtime genset akan dikonfirmasi admin.</p>}

              {!ready && issues.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3.5">
                  <p className="text-xs font-medium">Lengkapi dulu:</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                    {issues.map((i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="hidden lg:block">{waButton('h-12 w-full text-base')}</div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Angka ini estimasi. Harga final disepakati langsung dengan admin lewat WhatsApp, termasuk ketersediaan unit
                pada tanggal Anda.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Bilah total di layar kecil */}
      {rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Perkiraan total</p>
              <p className="num truncate text-lg font-bold text-ink">
                {formatRupiah(result.total)}
                {result.shippingPending && <span className="text-xs font-normal text-muted-foreground"> + ongkir</span>}
              </p>
            </div>
            {waButton('ml-auto h-11 shrink-0 px-4')}
          </div>
        </div>
      )}
    </div>
  )
}

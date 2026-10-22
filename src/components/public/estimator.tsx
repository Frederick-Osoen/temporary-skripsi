'use client'

import Link from 'next/link'
import { Info, MessageCircle, Minus, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STANDARD_HOURS } from '@/lib/orders/schedule'
import { formatRupiah, lineSubtotal } from '@/lib/orders/utils'
import { fleetPlanLabel } from '@/lib/public/fleet'
import { MAX_QTY, useEstimator, type EstimatorProps } from '@/lib/public/use-estimator'
import { PlaceInput } from './place-input'

const selectClass =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4 rounded-lg border bg-background p-4">
            <h2 className="text-sm font-semibold">{title}</h2>
            {children}
        </section>
    )
}

export function Estimator(props: EstimatorProps) {
    const {
        cartReady, rows, pick, setPick, addProduct, setQty, removeLine,
        rentalProducts, rentalGensets, salesProducts,
        acCount, hasManualGenset, useGenset, setUseGenset, gensetActive, recKva, autoProduct, autoMissing, customKva,
        today, startDate, setStartDate, endDate, setEndDate, startTime, setStartTime, endTime, setEndTime, datesOk, timeError,
        delivery, setDeliveryChoice, destination, changeDestination, pickDestination, calculate, shipping, plan,
        hasRental, hasSales, hasGenset, result, issues, ready, draft, recordLead,
        name, setName,
    } = useEstimator(props)

    // Hindari hydration mismatch / flicker sebelum localStorage dibaca
    if (!cartReady) {
        return <div className="py-12 text-center text-sm text-muted-foreground">Memuat kalkulator estimasi...</div>
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
                {/* 1. Produk */}
                <Block title="1. Pilih Produk">
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <select aria-label="Pilih produk" className={selectClass} value={pick} onChange={(e) => setPick(e.target.value)}>
                            <option value="">Pilih produk...</option>
                            <optgroup label="Sewa">{rentalProducts.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatRupiah(p.base_price)}/hari</option>)}</optgroup>
                            <optgroup label="Sewa Genset">{rentalGensets.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatRupiah(p.base_price)}/hari</option>)}</optgroup>
                            <optgroup label="Penjualan">{salesProducts.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatRupiah(p.base_price)}</option>)}</optgroup>
                        </select>
                        <Button type="button" disabled={!pick} onClick={() => { addProduct(pick); setPick('') }}>
                            <Plus className="mr-2 h-4 w-4" /> Tambah
                        </Button>
                    </div>

                    {rows.length === 0 ? (
                        <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                            Belum ada produk. Pilih dari daftar di atas atau <Link href="/katalog" className="underline">lihat katalog</Link>.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {rows.map(({ product: p, qty, auto }) => {
                                const rental = p.category === 'rental'
                                const sub = lineSubtotal({ qty, unit_price: p.base_price, is_rental: rental }, result.days)
                                return (
                                    <li key={`${p.id}:${auto ? 'auto' : 'manual'}`} className="rounded-md border p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">{p.name}</p>
                                                <div className="flex flex-wrap items-center gap-1">
                                                    <Badge variant={rental ? 'default' : 'secondary'} className="capitalize">{p.category}</Badge>
                                                    {auto && <Badge variant="outline">Rekomendasi sistem</Badge>}
                                                </div>
                                            </div>
                                            {!auto && (
                                                <Button type="button" variant="ghost" size="icon" aria-label={`Hapus ${p.name}`} onClick={() => removeLine(p.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                            {auto ? (
                                                <span className="text-sm text-muted-foreground">Jumlah: 1 unit</span>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <Button type="button" variant="outline" size="icon" aria-label="Kurangi" onClick={() => setQty(p.id, qty - 1)} disabled={qty <= 1}><Minus className="h-4 w-4" /></Button>
                                                    <Input type="number" min={1} max={MAX_QTY} step={1} inputMode="numeric" className="w-16 text-center" aria-label={`Jumlah ${p.name}`} value={qty} onChange={(e) => setQty(p.id, Number(e.target.value))} />
                                                    <Button type="button" variant="outline" size="icon" aria-label="Tambah" onClick={() => setQty(p.id, qty + 1)} disabled={qty >= MAX_QTY}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            )}
                                            <div className="text-right text-sm">
                                                <p className="font-medium">{formatRupiah(sub)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {qty} × {formatRupiah(p.base_price)}{rental && result.days > 1 ? ` × ${result.days} hari` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    {/* Helper genset */}
                    {acCount > 0 && !hasManualGenset && (
                        <div className="space-y-2 rounded-md bg-muted/40 p-3">
                            <label className="flex items-center gap-2 text-sm font-medium">
                                <input type="checkbox" checked={useGenset} onChange={(e) => setUseGenset(e.target.checked)} className="h-4 w-4 rounded border-input" />
                                Gunakan Genset (kapasitas direkomendasikan otomatis)
                            </label>
                            {gensetActive && recKva !== null && autoProduct && (
                                <p className="text-xs text-muted-foreground">Untuk {acCount} unit AC: {recKva} kVA. Butuh kapasitas lain? Tambahkan genset sendiri dari daftar produk.</p>
                            )}
                            {gensetActive && autoMissing && (
                                <p className="text-xs text-amber-700">Kebutuhan {recKva} kVA belum tersedia di katalog online. Admin akan membantu lewat WhatsApp.</p>
                            )}
                            {customKva && (
                                <p className="text-xs text-amber-700">Jumlah AC lebih dari 20 unit membutuhkan <strong>kapasitas genset custom</strong>. Konsultasikan lewat WhatsApp.</p>
                            )}
                        </div>
                    )}
                </Block>

                {/* 2. Tanggal */}
                <Block title="2. Tanggal & Jam">
                    <div className={`grid gap-4 ${hasRental ? 'sm:grid-cols-2' : 'sm:grid-cols-1 sm:max-w-xs'}`}>
                        <div className="space-y-2">
                            <Label htmlFor="start_date">{hasRental ? 'Tanggal mulai acara' : 'Tanggal pengiriman / pengambilan'}</Label>
                            <Input id="start_date" type="date" min={today} value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); if (!endDate || endDate < e.target.value) setEndDate(e.target.value) }} />
                        </div>
                        {hasRental && (
                            <div className="space-y-2">
                                <Label htmlFor="end_date">Tanggal selesai</Label>
                                <Input id="end_date" type="date" min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        )}
                    </div>
                    {hasRental && datesOk && <p className="text-sm">Durasi sewa: <strong>{result.days} hari</strong></p>}

                    {hasGenset && (
                        <div className="space-y-2">
                            <div className="grid max-w-sm grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="start_time">Jam mulai (tiap hari) <span className="text-destructive">*</span></Label>
                                    <Input id="start_time" type="time" value={startTime} required onChange={(e) => setStartTime(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="end_time">Jam selesai <span className="text-destructive">*</span></Label>
                                    <Input id="end_time" type="time" value={endTime} required onChange={(e) => setEndTime(e.target.value)} />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Standar pemakaian genset {STANDARD_HOURS} jam per hari; lebih dari itu dikenai overtime per jam (dibulatkan ke atas).
                                Jam ini dianggap sama setiap hari.
                            </p>
                            {timeError && <p role="alert" className="text-xs text-destructive">{timeError}</p>}
                        </div>
                    )}
                </Block>

                {/* 3. Pengiriman */}
                <Block title="3. Pengiriman">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <label className="flex items-center gap-2">
                            <input type="radio" name="delivery" checked={delivery === 'delivery'} onChange={() => setDeliveryChoice('delivery')} />
                            Diantar ke lokasi
                        </label>
                        <label className={`flex items-center gap-2 ${hasRental ? 'opacity-50' : ''}`}>
                            <input type="radio" name="delivery" disabled={hasRental} checked={delivery === 'store_pickup'} onChange={() => setDeliveryChoice('store_pickup')} />
                            Ambil di toko <span className="text-xs text-muted-foreground">(khusus pembelian)</span>
                        </label>
                    </div>

                    {hasRental && <p className="text-xs text-muted-foreground">Penyewaan selalu diantar dan dipasang di lokasi acara.</p>}

                    {hasRental && hasSales && (
                        <p className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 mt-2">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Barang pembelian akan dikirimkan bersamaan dengan armada barang sewaan.
                        </p>
                    )}

                    {delivery === 'delivery' && (
                        <div className="space-y-3 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="destination">Alamat tujuan</Label>
                                <PlaceInput id="destination" value={destination} onChange={changeDestination} onPick={pickDestination} />
                            </div>
                            <Button type="button" variant="outline" disabled={shipping.status === 'loading' || destination.trim().length < 3} onClick={() => void calculate(destination)}>
                                {shipping.status === 'loading' ? 'Menghitung...' : 'Hitung Ongkir'}
                            </Button>

                            {shipping.status === 'error' && <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{shipping.message}</p>}
                            {shipping.status === 'unavailable' && (
                                <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                    Layanan peta sedang bermasalah. Anda tetap bisa melanjutkan, ongkir akan dihitung admin.
                                </p>
                            )}
                            {shipping.status === 'ok' && (
                                <div className="space-y-1 rounded-md bg-muted/40 p-3 text-sm">
                                    <p>Jarak ± <strong>{shipping.distance_km} km</strong> · Armada: <strong>{fleetPlanLabel(plan)}</strong></p>
                                    {shipping.zone === 1 && <p className="text-green-700">Gratis ongkir (dalam radius 25 km).</p>}
                                    {shipping.zone === 3 && <p className="text-amber-700">Luar kota: ongkir ditentukan admin setelah konfirmasi.</p>}
                                    {shipping.zone === 2 && result.shippingFee !== null && <p>Ongkir: <strong>{formatRupiah(result.shippingFee)}</strong></p>}
                                    {shipping.reviewToll && shipping.zone === 2 && <p className="text-xs text-muted-foreground">Biaya tol dapat berbeda dan akan dikonfirmasi admin.</p>}
                                </div>
                            )}
                        </div>
                    )}
                </Block>

                {/* 4. Nama (opsional) */}
                <Block title="4. Data Anda (opsional)">
                    <div className="max-w-sm space-y-2">
                        <Label htmlFor="cust_name">Nama</Label>
                        <Input id="cust_name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Anda atau perusahaan" />
                    </div>
                </Block>
            </div>

            {/* Ringkasan */}
            <aside className="lg:col-span-1">
                <div className="space-y-4 rounded-lg border bg-background p-4 lg:sticky lg:top-20">
                    <h2 className="text-sm font-semibold">Ringkasan Estimasi</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">{result.hasRental ? `Sewa (${result.days} hari)` : 'Produk'}</span><span>{formatRupiah(result.itemsTotal)}</span></div>
                        {delivery === 'delivery' && (
                            <div className="flex justify-between"><span className="text-muted-foreground">Ongkir</span><span>{result.shippingPending ? 'dikonfirmasi admin' : formatRupiah(result.shippingFee ?? 0)}</span></div>
                        )}
                        {result.overtimeFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Overtime genset</span><span>{formatRupiah(result.overtimeFee)}</span></div>}
                        <div className="flex justify-between border-t pt-2 text-base font-semibold">
                            <span>Total</span>
                            <span>{formatRupiah(result.total)}{result.shippingPending ? ' + ongkir' : ''}</span>
                        </div>
                    </div>
                    {result.overtimeUnpriced && <p className="text-xs text-amber-700">Tarif overtime genset akan dikonfirmasi admin.</p>}

                    {!ready && issues.length > 0 && (
                        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
                    )}

                    {draft && !timeError ? (
                        <a href={draft.url} target="_blank" rel="noopener noreferrer" onClick={recordLead} className={buttonVariants({ className: 'w-full' })}>
                            <MessageCircle className="mr-2 h-4 w-4" /> Lanjutkan via WhatsApp
                        </a>
                    ) : (
                        <Button type="button" className="w-full" disabled><MessageCircle className="mr-2 h-4 w-4" /> Lanjutkan via WhatsApp</Button>
                    )}
                    <p className="text-xs text-muted-foreground">Ini hanya estimasi. Harga final disepakati langsung dengan admin lewat WhatsApp.</p>
                </div>
            </aside>
        </div>
    )
}
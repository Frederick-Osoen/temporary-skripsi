'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Info, MessageCircle, Minus, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isAcProduct } from '@/lib/maintenance'
import { STANDARD_HOURS, calcHours } from '@/lib/orders/schedule'
import { formatRupiah, lineSubtotal, rentalDays, todayWIB } from '@/lib/orders/utils'
import { calcEstimate, type EstimateInput, type EstimateLine } from '@/lib/public/estimate'
import { fleetPlanLabel, planFleet } from '@/lib/public/fleet'
import { findGensetProduct, recommendKva, type GensetRule } from '@/lib/public/genset'
import type { PublicProduct } from '@/lib/public/types'
import { buildWhatsAppDraft } from '@/lib/public/whatsapp'
import { PlaceInput } from './place-input'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/public/cart'

const MAX_QTY = 99
const MAX_DAYS = 60
const selectClass =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type RouteResponse = {
    distance_km: number
    zone: 1 | 2 | 3
    toll_needs_review: boolean
    fleet_costs?: { pickup: { shipping_fee: number | null }; truck: { shipping_fee: number | null } }
}

type ShippingState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ok'; zone: 1 | 2 | 3; distance_km: number; perFleet: { pickup: number | null; truck: number | null }; reviewToll: boolean }
    | { status: 'unavailable' } // peta bermasalah: ongkir dikonfirmasi admin
    | { status: 'error'; message: string }

function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-4 rounded-lg border bg-background p-4">
            <h2 className="text-sm font-semibold">{title}</h2>
            {children}
        </section>
    )
}

export function Estimator({ products, rules, initialAdd }: { products: PublicProduct[]; rules: GensetRule[]; initialAdd: string[] }) {
    const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
    const gensetProducts = useMemo(() => products.filter((p) => p.capacity_kva !== null), [products])
    const today = todayWIB()

    const router = useRouter()
    const cart = useCart()

    // Keranjang sekarang memakai cart global, bukan state lokal lagi
    const manual = cart.items

    const [pick, setPick] = useState('')
    const [useGenset, setUseGenset] = useState(false)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // Jam default dikosongkan sesuai instruksi
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')

    const [deliveryChoice, setDeliveryChoice] = useState<'delivery' | 'store_pickup'>('delivery')
    const [destination, setDestination] = useState('')
    const [shipping, setShipping] = useState<ShippingState>({ status: 'idle' })
    const [name, setName] = useState('')
    const routeSeq = useRef(0)

    // Kompatibilitas link lama /estimasi?add=ID
    const addedRef = useRef(false)
    useEffect(() => {
        if (!cart.ready || addedRef.current || !initialAdd || initialAdd.length === 0) return
        addedRef.current = true
        initialAdd.forEach(id => {
            if (byId.has(id)) cart.add(id)
        })
        router.replace('/estimasi')
    }, [cart.ready, initialAdd, cart, router, byId])

    // ---------- helper keranjang ----------
    function addProduct(id: string) {
        if (!byId.has(id)) return
        cart.add(id)
    }
    const setQty = (id: string, qty: number) => cart.setQty(id, Math.min(Math.max(qty || 1, 1), MAX_QTY))
    const removeLine = (id: string) => cart.remove(id)

    // ---------- genset otomatis (helper saat menyewa AC) ----------
    const acCount = manual.reduce((s, l) => {
        const p = byId.get(l.id)
        return p && isAcProduct(p.name) ? s + l.qty : s
    }, 0)
    const hasManualGenset = manual.some((l) => byId.get(l.id)?.capacity_kva != null)
    const gensetActive = useGenset && acCount > 0 && !hasManualGenset
    const recKva = gensetActive ? recommendKva(acCount, rules) : null
    const customKva = gensetActive && recKva === null
    const autoProduct = (() => {
        if (recKva === null) return null
        const found = findGensetProduct(gensetProducts, recKva)
        return found ? byId.get(found.id) ?? null : null
    })()
    const autoMissing = recKva !== null && !autoProduct

    // ---------- baris untuk perhitungan ----------
    const toLine = (p: PublicProduct, qty: number): EstimateLine => ({
        product_id: p.id, name: p.name, category: p.category, qty,
        unit_price: p.base_price, overtime_rate: p.overtime_rate, capacity_kva: p.capacity_kva,
    })
    const rows = [
        ...manual.flatMap((l) => {
            const p = byId.get(l.id)
            return p ? [{ product: p, qty: l.qty, auto: false }] : []
        }),
        ...(autoProduct ? [{ product: autoProduct, qty: 1, auto: true }] : []),
    ]
    const lines = rows.map((r) => toLine(r.product, r.qty))

    // Status kategori pesanan
    const hasRental = lines.some((l) => l.category === 'rental')
    const hasSales = lines.some((l) => l.category === 'sales')
    const hasGenset = lines.some((l) => l.capacity_kva !== null)
    const delivery = hasRental ? 'delivery' : deliveryChoice

    // Error jam genset
    const timeError = hasGenset && (!startTime || !endTime)
        ? 'Jam mulai dan jam selesai wajib diisi untuk sewa genset (dasar perhitungan lembur).'
        : null

    // ---------- ongkir ----------
    async function calculate(text: string) {
        const dest = text.trim()
        if (dest.length < 3) return setShipping({ status: 'error', message: 'Alamat tujuan minimal 3 karakter.' })
        const seq = ++routeSeq.current
        setShipping({ status: 'loading' })
        try {
            const res = await fetch('/api/distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-source': 'public' },
                body: JSON.stringify({ destination: dest, fleet_type: 'pickup' }),
            })
            const json = (await res.json().catch(() => null)) as (RouteResponse & { error?: string; retry_after?: number }) | null
            if (seq !== routeSeq.current) return
            if (res.ok && json?.fleet_costs) {
                return setShipping({
                    status: 'ok', zone: json.zone, distance_km: json.distance_km, reviewToll: json.toll_needs_review,
                    perFleet: { pickup: json.fleet_costs.pickup.shipping_fee, truck: json.fleet_costs.truck.shipping_fee },
                })
            }
            if (res.status === 429) return setShipping({ status: 'error', message: `Terlalu banyak permintaan. Coba lagi dalam ${json?.retry_after ?? 60} detik.` })
            if (res.status === 404) return setShipping({ status: 'error', message: 'Alamat tidak ditemukan. Tulis lebih lengkap (kecamatan, kota).' })
            if (res.status === 400) return setShipping({ status: 'error', message: json?.error ?? 'Alamat tidak valid.' })
            setShipping({ status: 'unavailable' })
        } catch {
            if (seq === routeSeq.current) setShipping({ status: 'unavailable' })
        }
    }

    function changeDestination(v: string) {
        setDestination(v)
        if (shipping.status !== 'idle') {
            routeSeq.current++
            setShipping({ status: 'idle' })
        }
    }
    function pickDestination(text: string) {
        setDestination(text)
        void calculate(text)
    }

    // ---------- hasil ----------
    const plan = planFleet(lines)
    const input: EstimateInput = {
        lines, start_date: startDate, end_date: hasRental ? endDate : startDate,
        start_time: startTime, end_time: endTime, delivery, plan,
        shipping: shipping.status === 'ok' ? { zone: shipping.zone, perFleet: shipping.perFleet } : { zone: null, perFleet: null },
    }
    const result = calcEstimate(input)

    const datesOk = !!startDate && (!hasRental || (!!endDate && endDate >= startDate))
    const tooLong = hasRental && datesOk && rentalDays(startDate, endDate) > MAX_DAYS
    const issues: string[] = []

    if (lines.length === 0) issues.push('Pilih minimal satu produk.')
    if (!startDate) issues.push('Pilih tanggal.')
    else if (!datesOk) issues.push('Tanggal selesai tidak boleh sebelum tanggal mulai.')
    else if (tooLong) issues.push(`Durasi sewa maksimal ${MAX_DAYS} hari. Untuk durasi lebih lama, hubungi admin.`)

    if (hasGenset && startTime && endTime && calcHours(startTime, endTime) === null) {
        issues.push('Jam mulai dan selesai tidak boleh sama.')
    }
    if (delivery === 'delivery') {
        if (destination.trim().length < 3) issues.push('Isi alamat tujuan.')
        else if (shipping.status !== 'ok' && shipping.status !== 'unavailable') issues.push('Hitung ongkir terlebih dahulu.')
    }

    const ready = issues.length === 0 && !timeError

    const notes: string[] = []
    if (customKva) notes.push(`Kebutuhan genset: kapasitas custom (${acCount} unit AC), mohon konsultasi.`)
    if (autoMissing) notes.push(`Kebutuhan genset: ${recKva} kVA (belum ada di katalog online), mohon dibantu.`)
    if (result.overtimeUnpriced) notes.push('Tarif overtime genset mohon dikonfirmasi.')
    if (shipping.status === 'unavailable') notes.push('Ongkir belum terhitung otomatis, mohon dihitung admin.')
    if (shipping.status === 'ok' && shipping.reviewToll) notes.push('Biaya tol mohon dikonfirmasi admin.')

    const draft = ready
        ? buildWhatsAppDraft({
            name,
            destination: destination.trim(),
            fleetLabel: delivery === 'delivery' ? fleetPlanLabel(plan) : null,
            distanceKm: shipping.status === 'ok' ? shipping.distance_km : null,
            input, result, notes,
        })
        : null

    const rentalProducts = products.filter((p) => p.category === 'rental' && p.capacity_kva === null)
    const rentalGensets = products.filter((p) => p.capacity_kva !== null)
    const salesProducts = products.filter((p) => p.category === 'sales')

    // Hindari hydration mismatch / flicker sebelum localStorage dibaca
    if (!cart.ready) {
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
                        <a href={draft.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: 'w-full' })}>
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
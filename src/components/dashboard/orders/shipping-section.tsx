'use client'

import { useCallback, useEffect, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { formatNumber, formatRupiah, resolveShipping, } from '@/lib/orders/utils'
import { PICKUP_DESTINATION, type OrderFormValues, type ShippingValues } from '@/lib/validations/order'
import { FieldError, Section, selectClass } from './ui'

type RouteResult = {
    distance_km: number
    round_trip_km: number
    zone: 1 | 2 | 3
    fleet_label: string
    fuel_fee: number
    toll_fee: number
    toll_source: 'google' | 'estimated' | 'unavailable' | 'not_applicable'
    toll_needs_review: boolean
    suggested_shipping_fee: number | null
    cached: boolean
}

const EMPTY_SHIPPING: ShippingValues = {
    zone: 0,
    distance_km: 0,
    auto_fuel_fee: 0,
    auto_toll_fee: 0,
    toll_override: null,
    manual_shipping_fee: null,
}

const TOLL_SOURCE_LABEL = {
    google: 'Data Google',
    estimated: 'Estimasi sistem',
    unavailable: 'Tidak tersedia',
    not_applicable: '-',
} as const

const ZONE_LABEL = { 1: 'Zona 1 (gratis ongkir)', 2: 'Zona 2', 3: 'Zona 3 (luar kota)' } as const

export function ShippingSection({ hasRental, initialManual = false }: { hasRental: boolean; initialManual?: boolean }) {
    const { control, register, watch, setValue, getValues, setError, clearErrors, formState: { errors } } =
        useFormContext<OrderFormValues>()

    const [route, setRoute] = useState<RouteResult | null>(null)
    const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'manual'>(initialManual ? 'manual' : 'idle')
    const [apiError, setApiError] = useState<string | null>(null)

    const mode = watch('delivery_mode')
    const shipping = watch('shipping')
    const resolved = resolveShipping(mode, shipping)
    const zone = shipping.zone

    const resetRoute = useCallback(() => {
        setRoute(null)
        setStatus('idle')
        setApiError(null)
        setValue('shipping', EMPTY_SHIPPING)
    }, [setValue])

    // Ambil di toko hanya untuk sales: paksa kembali ke "diantar" jika keranjang berisi rental
    useEffect(() => {
        if (hasRental && mode === 'store_pickup') {
            setValue('delivery_mode', 'delivery')
            setValue('destination', '')
            resetRoute()
        }
    }, [hasRental, mode, setValue, resetRoute])

    async function calculateRoute(fleetOverride?: string) {
        const destination = getValues('destination').trim()
        const fleet = fleetOverride ?? getValues('fleet_type')
        if (destination.length < 3) {
            setError('destination', { type: 'manual', message: 'Alamat tujuan minimal 3 karakter' })
            return
        }
        clearErrors('destination')
        setStatus('loading')
        setApiError(null)

        try {
            const res = await fetch('/api/distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ destination, fleet_type: fleet }),
            })
            const json = await res.json().catch(() => null)

            if (!res.ok || !json) {
                setRoute(null)
                setStatus('idle')
                setValue('shipping', EMPTY_SHIPPING)
                if (res.status === 429) setApiError(`Terlalu banyak permintaan. Coba lagi dalam ${json?.retry_after ?? 60} detik.`)
                else if (res.status === 404) setApiError('Alamat tidak ditemukan. Tulis lebih lengkap (kecamatan, kota).')
                else if (res.status === 400) setApiError(json?.error ?? 'Input tidak valid.')
                else setApiError('Layanan peta sedang bermasalah. Anda dapat mengisi ongkir secara manual.')
                return
            }

            const r = json as RouteResult
            setRoute(r)
            setStatus('ok')
            setValue('shipping', {
                zone: r.zone,
                distance_km: r.distance_km,
                auto_fuel_fee: r.fuel_fee,
                auto_toll_fee: r.toll_fee,
                toll_override: null,
                manual_shipping_fee: null,
            })
            clearErrors('shipping')
        } catch (err) {
            console.error('[shipping] gagal menghitung ongkir:', err)
            setRoute(null)
            setStatus('idle')
            setValue('shipping', EMPTY_SHIPPING)
            setApiError('Tidak dapat menghubungi server. Anda dapat mengisi ongkir secara manual.')
        }
    }

    // Fallback (Google gagal / luar jangkauan): jalur manual memakai logika Zona 3
    function enableManual() {
        setRoute(null)
        setStatus('manual')
        setApiError(null)
        setValue('shipping', { ...EMPTY_SHIPPING, zone: 3 })
        clearErrors('shipping')
    }

    const suggested = route?.suggested_shipping_fee ?? null

    const modeField = register('delivery_mode', {
        onChange: (e) => {
            if (e.target.value === 'store_pickup') {
                setValue('destination', PICKUP_DESTINATION)
                setValue('fleet_type', 'pickup')
            } else {
                setValue('destination', '') // kembali kosong saat "Diantar ke lokasi"
            }
            clearErrors('destination')
            resetRoute()
        },
    })

    return (
        <Section title="Pengiriman">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-2">
                    <input type="radio" value="delivery" {...modeField} />
                    Diantar ke lokasi
                </label>
                <label className={`flex items-center gap-2 ${hasRental ? 'opacity-50' : ''}`}>
                    <input type="radio" value="store_pickup" disabled={hasRental} {...modeField} />
                    Ambil di toko <span className="text-xs text-muted-foreground">(khusus sales)</span>
                </label>
                {hasRental && (
                    <p className="text-xs text-muted-foreground opacity-50">
                        Ambil di toko hanya untuk pesanan sales. Untuk sewa + beli yang diambil sendiri, <span className='font-semibold'>buat dua pesanan terpisah.</span>
                    </p>
                )}
            </div>

            {mode === 'store_pickup' ? (
                <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    Diambil di toko, tanpa ongkir. Tujuan dicatat sebagai &quot;{PICKUP_DESTINATION}&quot;.
                </p>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="destination">Alamat tujuan</Label>
                            <Input
                                id="destination"
                                placeholder="Contoh: Jl. Basuki Rahmat 1, Surabaya"
                                {...register('destination', {
                                    onChange: () => {
                                        if (status === 'ok') resetRoute() // alamat berubah: hasil lama tidak berlaku
                                    },
                                })}
                            />
                            <FieldError message={errors.destination?.message} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fleet_type">Armada</Label>
                            <select
                                id="fleet_type"
                                className={selectClass}
                                {...register('fleet_type', {
                                    onChange: (e) => {
                                        if (status === 'ok') void calculateRoute(e.target.value) // hitung ulang untuk armada baru
                                    },
                                })}
                            >
                                <option value="pickup">Mobil Pickup</option>
                                <option value="truck">Truk</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="button" variant="outline" onClick={() => void calculateRoute()} disabled={status === 'loading'}>
                            {status === 'loading' ? 'Menghitung...' : 'Hitung Ongkir'}
                        </Button>
                        {status !== 'manual' && (
                            <button type="button" onClick={enableManual} className="text-sm text-muted-foreground underline">
                                Isi ongkir manual
                            </button>
                        )}
                    </div>

                    {apiError && <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{apiError}</p>}
                    <FieldError message={errors.shipping?.zone?.message} />

                    {zone > 0 && (
                        <div className="space-y-4 rounded-md border bg-muted/30 p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={status === 'manual' ? 'outline' : zone === 3 ? 'destructive' : 'secondary'}>
                                    {status === 'manual' ? 'Ongkir manual' : ZONE_LABEL[zone as 1 | 2 | 3]}
                                </Badge>
                                {route ? (
                                    <span className="text-muted-foreground">
                                        {route.distance_km} km (pulang-pergi {route.round_trip_km} km) · {route.fleet_label}
                                        {route.cached ? ' · dari cache' : ''}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">Mode manual</span>
                                )}
                            </div>

                            {status === 'manual' && (
                                <div className="max-w-40 space-y-1">
                                    <Label htmlFor="distance_km">Jarak (km, opsional)</Label>
                                    <Input id="distance_km" type="number" min={0} step="0.1" {...register('shipping.distance_km', { valueAsNumber: true })} />
                                    <FieldError message={errors.shipping?.distance_km?.message} />
                                </div>
                            )}

                            {route && zone >= 2 && (
                                <div className="space-y-1">
                                    <div className="flex justify-between"><span>BBM (pulang-pergi)</span><span>{formatRupiah(route.fuel_fee)}</span></div>
                                    <div className="flex justify-between">
                                        <span>Tol (pulang-pergi) <span className="text-xs text-muted-foreground">· {TOLL_SOURCE_LABEL[route.toll_source]}</span></span>
                                        <span>{formatRupiah(route.toll_fee)}</span>
                                    </div>
                                    {route.toll_needs_review && (
                                        <p className="text-xs text-amber-700">
                                            Data tol dari Google kosong atau hanya estimasi. Periksa rutenya dan koreksi di bawah bila perlu.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                {zone >= 2 && (
                                    <div className="space-y-1">
                                        <Label htmlFor="toll_override">Koreksi tol manual (Rp, pulang-pergi)</Label>
                                        <Controller
                                            control={control}
                                            name="shipping.toll_override"
                                            render={({ field }) => (
                                                <RupiahInput
                                                    id="toll_override"
                                                    value={field.value}
                                                    onValueChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    placeholder={route ? formatNumber(route.toll_fee) : '0'}
                                                />
                                            )}
                                        />
                                        <FieldError message={errors.shipping?.toll_override?.message} />
                                        <p className="text-xs text-muted-foreground">Kosongkan untuk memakai hasil sistem.</p>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label htmlFor="manual_shipping_fee">
                                        {zone === 3 ? 'Ongkir manual (Rp) *' : 'Ubah ongkir (opsional, hasil nego)'}
                                    </Label>
                                    <Controller
                                        control={control}
                                        name="shipping.manual_shipping_fee"
                                        render={({ field }) => (
                                            <RupiahInput
                                                id="manual_shipping_fee"
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                onBlur={field.onBlur}
                                                placeholder={suggested !== null ? formatNumber(suggested) : '0'}
                                            />
                                        )}
                                    />
                                    <FieldError message={errors.shipping?.manual_shipping_fee?.message} />
                                    {zone === 3 && suggested !== null && (
                                        <p className="text-xs text-muted-foreground">
                                            Saran sistem: {formatRupiah(suggested)} (BBM + tol pulang-pergi). Harga luar kota ditentukan admin.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between border-t pt-3 font-medium">
                                <span>Ongkir yang dikenakan</span>
                                <span>{resolved.ok ? formatRupiah(resolved.value.shipping_fee) : '-'}</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Section>
    )
}
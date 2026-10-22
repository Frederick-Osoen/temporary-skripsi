'use client'

// LOGIKA estimator publik (state, perhitungan, validasi, ongkir, lead).
// File ini TIDAK berisi tampilan. Tampilan ada di components/public/estimator.tsx
// dan boleh didesain ulang tanpa menyentuh file ini.

import { useMemo, useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAcProduct } from '@/lib/maintenance'
import { calcHours, STANDARD_HOURS } from '@/lib/orders/schedule'
import { rentalDays, todayWIB } from '@/lib/orders/utils'
import { calcEstimate, type EstimateInput, type EstimateLine } from '@/lib/public/estimate'
import { fleetPlanLabel, planFleet } from '@/lib/public/fleet'
import { findGensetProduct, recommendKva, type GensetRule } from '@/lib/public/genset'
import type { PublicProduct } from '@/lib/public/types'
import { buildWhatsAppDraft } from '@/lib/public/whatsapp'
import { useCart } from '@/lib/public/cart'
import { sendLead } from '@/lib/public/leads-client'

export const MAX_QTY = 99
export const MAX_DAYS = 60
export { STANDARD_HOURS }

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

export type EstimatorProps = { products: PublicProduct[]; rules: GensetRule[]; initialAdd: string[] }

export function useEstimator({ products, rules, initialAdd }: EstimatorProps) {
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

    // Catat lead saat pelanggan menekan "Lanjutkan via WhatsApp" (tidak menghambat pembukaan WhatsApp)
    function recordLead() {
        sendLead({
            customer_name: name.trim() || undefined,
            total_estimate: Math.round(result.total),
            payload: {
                items: lines.map((l) => ({ name: l.name, qty: l.qty, category: l.category })),
                start_date: startDate,
                end_date: input.end_date,
                start_time: hasGenset ? startTime : null,
                end_time: hasGenset ? endTime : null,
                delivery,
                destination: delivery === 'delivery' ? destination.trim() : null,
                fleet: delivery === 'delivery' ? fleetPlanLabel(plan) : null,
                distance_km: shipping.status === 'ok' ? shipping.distance_km : null,
                shipping_pending: result.shippingPending,
                notes,
            },
        })
    }

    const rentalProducts = products.filter((p) => p.category === 'rental' && p.capacity_kva === null)
    const rentalGensets = products.filter((p) => p.capacity_kva !== null)
    const salesProducts = products.filter((p) => p.category === 'sales')


    return {
        // keranjang & produk
        cartReady: cart.ready, rows, pick, setPick, addProduct, setQty, removeLine,
        rentalProducts, rentalGensets, salesProducts,
        // genset otomatis
        acCount, hasManualGenset, useGenset, setUseGenset, gensetActive, recKva, autoProduct, autoMissing, customKva,
        // tanggal & jam
        today, startDate, setStartDate, endDate, setEndDate, startTime, setStartTime, endTime, setEndTime, datesOk, timeError,
        // pengiriman
        delivery, setDeliveryChoice, destination, changeDestination, pickDestination, calculate, shipping, plan,
        // status pesanan & hasil
        hasRental, hasSales, hasGenset, result, issues, ready, draft, recordLead,
        // data pelanggan
        name, setName,
    }
}

export type EstimatorState = ReturnType<typeof useEstimator>

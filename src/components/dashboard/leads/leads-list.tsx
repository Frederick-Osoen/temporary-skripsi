'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateLeadStatus } from '@/app/dashboard/leads/actions'
import { safeAction } from '@/lib/action-client'
import { formatDate, formatRupiah } from '@/lib/orders/utils'

export type LeadStatus = 'new' | 'contacted' | 'converted' | 'dismissed'

export type Lead = {
  id: string
  created_at: string
  customer_name: string
  payload: {
    items?: { name: string; qty: number; category: string }[]
    start_date?: string
    end_date?: string
    start_time?: string | null
    end_time?: string | null
    delivery?: string
    destination?: string | null
    fleet?: string | null
    distance_km?: number | null
    shipping_pending?: boolean
    notes?: string[]
  } | null
  total_estimate: number
  status: LeadStatus
  converted_order_id: string | null
}

const STATUS: { value: LeadStatus; label: string; badge: string }[] = [
  { value: 'new', label: 'Baru', badge: 'border-blue-300 bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Sudah dihubungi', badge: 'border-amber-300 bg-amber-100 text-amber-800' },
  { value: 'converted', label: 'Jadi pesanan', badge: 'border-green-300 bg-green-100 text-green-800' },
  { value: 'dismissed', label: 'Diabaikan', badge: 'border-gray-300 bg-gray-100 text-gray-700' },
]

const selectClass =
  'h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })

export function LeadsList({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState<LeadStatus | 'all'>('new')
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const shown = leads.filter((l) => filter === 'all' || l.status === filter)
  const countOf = (s: LeadStatus) => leads.filter((l) => l.status === s).length

  function change(id: string, status: LeadStatus) {
    setError(null)
    setPendingId(id)
    startTransition(async () => {
      const res = await safeAction(() => updateLeadStatus(id, status))
      if (!res.ok) setError(res.error)
      setPendingId(null)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
          Semua <span className="ml-1.5 text-xs opacity-70">{leads.length}</span>
        </Button>
        {STATUS.map((s) => (
          <Button key={s.value} size="sm" variant={filter === s.value ? 'default' : 'outline'} onClick={() => setFilter(s.value)}>
            {s.label} <span className="ml-1.5 text-xs opacity-70">{countOf(s.value)}</span>
          </Button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {shown.length === 0 && (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">Tidak ada lead pada filter ini.</p>
      )}

      <ul className="space-y-2">
        {shown.map((l) => {
          const p = l.payload
          const st = STATUS.find((s) => s.value === l.status)
          const isRental = p?.items?.some((i) => i.category === 'rental')
          return (
            <li key={l.id} className="rounded-lg border bg-background p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{l.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{dateTime.format(new Date(l.created_at))}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">
                    {formatRupiah(l.total_estimate)}
                    {p?.shipping_pending ? <span className="text-xs font-normal text-muted-foreground"> + ongkir</span> : null}
                  </p>
                  {st && <Badge variant="outline" className={`mt-1 ${st.badge}`}>{st.label}</Badge>}
                </div>
              </div>

              {p?.items && p.items.length > 0 && (
                <p className="mt-2">{p.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
              )}

              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {p?.start_date && (
                  <p>
                    {isRental ? 'Acara: ' : 'Tanggal: '}
                    {formatDate(p.start_date)}
                    {p.end_date && p.end_date !== p.start_date ? ` – ${formatDate(p.end_date)}` : ''}
                    {p.start_time && p.end_time ? ` · jam ${p.start_time}–${p.end_time}` : ''}
                  </p>
                )}
                {p?.delivery === 'store_pickup' && <p>Diambil di toko</p>}
                {p?.delivery === 'delivery' && p.destination && (
                  <p>
                    Tujuan: {p.destination}
                    {p.distance_km ? ` (± ${p.distance_km} km)` : ''}
                    {p.fleet ? ` · ${p.fleet}` : ''}
                  </p>
                )}
                {p?.notes?.map((n) => <p key={n}>Catatan: {n}</p>)}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  aria-label="Ubah status lead"
                  className={selectClass}
                  value={l.status}
                  disabled={pendingId === l.id}
                  onChange={(e) => change(l.id, e.target.value as LeadStatus)}
                >
                  {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {l.converted_order_id ? (
                  <Link href={`/dashboard/orders/${l.converted_order_id}`} className="text-xs underline">Lihat pesanan</Link>
                ) : (
                  <Link href="/dashboard/orders/new" className="text-xs underline">Buat pesanan</Link>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

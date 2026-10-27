'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TimeInput } from '@/components/ui/time-input'
import { saveSchedule } from '@/app/dashboard/orders/actions'
import { safeAction } from '@/lib/action-client'
import { formatDate, formatRupiah } from '@/lib/orders/utils'
import {
  STANDARD_HOURS, billableHours, calcHours, calcOvertimeFee, eachDay, overtimeOf, type ScheduleRow,
} from '@/lib/orders/schedule'
import { Section } from './ui'

type Props = {
  orderId: string
  version: number
  locked: boolean
  startDate: string
  endDate: string
  schedules: ScheduleRow[]
  overtimeItems: { name: string; qty: number; rate: number }[]
  missingRate: string[] // genset tanpa tarif overtime
}

type DayDraft = { start: string; end: string }

export function ScheduleSection({
  orderId, version, locked, startDate, endDate, schedules, overtimeItems, missingRate,
}: Props) {
  const router = useRouter()
  const days = eachDay(startDate, endDate)
  const [rows, setRows] = useState<Record<string, DayDraft>>(() =>
    Object.fromEntries(schedules.map((s) => [s.schedule_date, { start: s.start_time, end: s.end_time }]))
  )
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [pending, startTransition] = useTransition()

  const ratePerHour = overtimeItems.reduce((s, i) => s + i.qty * i.rate, 0)
  const overtimes = days.map((d) => {
    const r = rows[d]
    const h = r && r.start && r.end ? calcHours(r.start, r.end) : null
    return h === null ? 0 : overtimeOf(h)
  })
  const totalOvertime = overtimes.reduce((s, o) => s + o, 0)
  const feeEstimate = calcOvertimeFee(overtimes, ratePerHour)

function setRow(date: string, patch: Partial<DayDraft>) {
    setRows((prev) => {
      const existing = prev[date] || { start: '', end: '' }
      return { ...prev, [date]: { ...existing, ...patch } }
    })
  }
  function copyFirst() {
    const first = days.map((d) => rows[d]).find((r) => r && r.start && r.end)
    if (!first) return
    setRows(Object.fromEntries(days.map((d) => [d, { ...first }])))
  }

  function submit() {
    setError(null)
    setConflict(false)

    const payload: { date: string; start: string; end: string }[] = []
    for (const d of days) {
      const r = rows[d]
      if (!r || (!r.start && !r.end)) continue
      if (!r.start || !r.end) return setError(`Lengkapi jam mulai dan selesai untuk ${formatDate(d)}.`)
      if (calcHours(r.start, r.end) === null) return setError(`Jam mulai dan selesai ${formatDate(d)} tidak boleh sama.`)
      payload.push({ date: d, start: r.start, end: r.end })
    }

    startTransition(async () => {
      const res = await safeAction(() => saveSchedule({ order_id: orderId, version, days: payload }))
      if (res.ok) return
      setError(res.error)
      setConflict(res.code === 'CONFLICT' || res.code === 'UNAVAILABLE')
    })
  }

  return (
    <Section title="Jadwal Operasional">
      <p className="text-xs text-muted-foreground">
        Isi jam pemakaian unit per hari. Batas standar {STANDARD_HOURS} jam per hari. Kelebihannya dihitung overtime dan
        ditagih per jam yang dimulai. Jam selesai lebih kecil dari jam mulai berarti melewati tengah malam.
      </p>

      {missingRate.length > 0 && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Tarif overtime belum diatur untuk: {missingRate.join(', ')}. Overtime produk ini belum ikut ditagih. Atur di menu Produk.
        </p>
      )}

      <div className="space-y-2">
        {days.map((d, idx) => {
          const r = rows[d] ?? { start: '', end: '' }
          const hours = r.start && r.end ? calcHours(r.start, r.end) : null
          const ot = hours === null ? 0 : overtimeOf(hours)
          return (
            <div key={d} className="grid items-center gap-2 rounded-md border p-2 sm:grid-cols-[9rem_1fr_1fr_1fr]">
              <p className="text-sm font-medium">{formatDate(d)}</p>
              <TimeInput aria-label={`Jam mulai ${d}`} disabled={locked} value={r.start} onChange={(v) => setRow(d, { start: v })} />
              <TimeInput aria-label={`Jam selesai ${d}`} disabled={locked} value={r.end} onChange={(v) => setRow(d, { end: v })} />
              <p className="text-xs text-muted-foreground">
                {hours === null
                  ? r.start && r.end ? 'Jam tidak valid' : 'Belum diisi'
                  : `${hours} jam${ot > 0 ? ` · overtime ${ot} jam (ditagih ${billableHours(ot)})` : ''}`}
              </p>
              {idx === 0 && false}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          Total overtime <strong>{totalOvertime} jam</strong>
          {ratePerHour > 0 && <> · estimasi tagihan <strong>{formatRupiah(feeEstimate)}</strong></>}
        </p>
        {!locked && (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyFirst}>Samakan semua hari</Button>
            <Button type="button" size="sm" onClick={submit} disabled={pending}>
              {pending ? 'Menyimpan...' : 'Simpan Jadwal'}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          {conflict && (
            <Button type="button" size="sm" variant="outline" onClick={() => router.refresh()}>Muat data terbaru</Button>
          )}
        </div>
      )}
    </Section>
  )
}
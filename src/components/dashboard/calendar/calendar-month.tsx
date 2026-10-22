'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { KIND_META, monthTitle, shiftMonth, type CalendarEvent, type CalendarKind } from '@/lib/calendar'
import { formatDate } from '@/lib/orders/utils'
import { cn } from '@/lib/utils'
import { OrderStatusBadge } from '@/components/dashboard/orders/status-badge'

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MAX_CHIPS = 3

export function CalendarMonth({
  ym, today, weeks, eventsByDate,
}: {
  ym: string
  today: string
  weeks: string[][]
  eventsByDate: Record<string, CalendarEvent[]>
}) {
  const todayInMonth = today.startsWith(ym)
  const [selected, setSelected] = useState<string>(todayInMonth ? today : `${ym}-01`)
  const selectedEvents = eventsByDate[selected] ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold capitalize">{monthTitle(ym)}</h2>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/calendar?m=${shiftMonth(ym, -1)}`} className={buttonVariants({ variant: 'outline', size: 'icon' })} aria-label="Bulan sebelumnya">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href="/dashboard/calendar" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Hari ini</Link>
          <Link href={`/dashboard/calendar?m=${shiftMonth(ym, 1)}`} className={buttonVariants({ variant: 'outline', size: 'icon' })} aria-label="Bulan berikutnya">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {(Object.keys(KIND_META) as CalendarKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', KIND_META[k].dot)} />
            {KIND_META[k].label}
          </span>
        ))}
        <span>⚠ = unit belum lengkap</span>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
            {DAY_NAMES.map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>

          {weeks.map((week) => (
            <div key={week[0]} className="grid grid-cols-7">
              {week.map((date) => {
                const events = eventsByDate[date] ?? []
                const inMonth = date.startsWith(ym)
                const isToday = date === today
                const isSelected = date === selected
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelected(date)}
                    className={cn(
                      'min-h-24 border-b border-r p-1 text-left align-top transition-colors hover:bg-muted/40',
                      !inMonth && 'bg-muted/20 text-muted-foreground',
                      isSelected && 'ring-2 ring-inset ring-primary'
                    )}
                  >
                    <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs', isToday && 'bg-primary text-primary-foreground')}>
                      {Number(date.slice(8))}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {events.slice(0, MAX_CHIPS).map((e) => (
                        <div
                          key={e.key}
                          className={cn('truncate rounded border px-1 text-[10px] leading-4', KIND_META[e.kind].chip, e.status === 'completed' && 'opacity-60')}
                        >
                          {e.warn && '⚠ '}{KIND_META[e.kind].short} · {e.customer}
                        </div>
                      ))}
                      {events.length > MAX_CHIPS && (
                        <div className="text-[10px] text-muted-foreground">+{events.length - MAX_CHIPS} lagi</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-background p-4">
        <h3 className="text-sm font-semibold">{formatDate(selected)}</h3>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada jadwal.</p>
        ) : (
          <ul className="divide-y">
            {selectedEvents.map((e) => (
              <li key={e.key}>
                <Link href={`/dashboard/orders/${e.order_id}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm hover:bg-muted/40">
                  <span className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', KIND_META[e.kind].dot)} />
                    <span className="font-medium">{KIND_META[e.kind].label}</span>
                    <span className="text-muted-foreground">{e.order_code} · {e.customer}</span>
                    {e.warn && <span className="text-xs text-amber-700">⚠ unit belum lengkap</span>}
                  </span>
                  <OrderStatusBadge status={e.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { Clock, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// Input jam 24 jam (HH:MM) yang nyaman di HP dan desktop:
// - ketik angka saja ("830" menjadi 08:30), titik dua otomatis, keypad angka di HP
// - tombol -/+ untuk geser 30 menit, tombol jam cepat (opsional)
// Nilai selalu "" atau "HH:MM" yang valid, sama dengan kontrak <input type="time">.

const STEP = 30

const pad = (n: number) => String(n).padStart(2, '0')

/** Ubah ketikan bebas menjadi HH:MM valid; null bila belum bisa dibaca. */
export function parseTime(raw: string): string | null {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  if (!d) return null
  let h: number
  let m: number
  if (d.length <= 2) {
    h = Number(d)
    m = 0
  } else {
    h = Number(d.slice(0, d.length - 2))
    m = Number(d.slice(-2))
  }
  if (h > 23 || m > 59) return null
  return `${pad(h)}:${pad(m)}`
}

function shift(value: string, delta: number): string {
  const base = parseTime(value)
  const [h, m] = (base ?? '08:00').split(':').map(Number)
  const t = (((h * 60 + m + delta) % 1440) + 1440) % 1440
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
}

type Props = {
  value: string
  onChange: (v: string) => void
  id?: string
  'aria-label'?: string
  disabled?: boolean
  required?: boolean
  /** Tombol jam cepat, mis. ['08:00','12:00','18:00'] */
  presets?: string[]
  className?: string
}

export function TimeInput({ value, onChange, id, disabled, required, presets, className, ...rest }: Props) {
  // Selama mengetik, tampilkan ketikan mentah; saat blur dirapikan jadi HH:MM
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? value

  const typing = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    const text = digits.length > 2 ? `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}` : digits
    setDraft(text)
    // Beri nilai valid begitu 4 digit lengkap; selain itu tunggu blur
    if (digits.length === 4) {
      const ok = parseTime(digits)
      if (ok) onChange(ok)
    }
    if (digits.length === 0) onChange('')
  }

  const commit = () => {
    if (draft === null) return
    const ok = parseTime(draft)
    onChange(ok ?? '')
    setDraft(null)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div
        className={cn(
          'flex h-10 items-center rounded-md border border-input bg-background shadow-xs focus-within:ring-2 focus-within:ring-ring',
          disabled && 'opacity-60'
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Mundur 30 menit"
          onClick={() => { setDraft(null); onChange(shift(value, -STEP)) }}
          className="flex h-full w-9 shrink-0 items-center justify-center rounded-l-md text-muted-foreground hover:bg-muted active:bg-muted disabled:pointer-events-none"
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </button>
        <div className="relative min-w-0 flex-1">
          <Clock className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:MM"
            maxLength={5}
            disabled={disabled}
            required={required}
            aria-label={rest['aria-label']}
            value={shown}
            onChange={(e) => typing(e.target.value)}
            onBlur={commit}
            onFocus={(e) => e.currentTarget.select()}
            className="h-full w-full bg-transparent pl-7 pr-1 text-center text-sm tabular-nums outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Maju 30 menit"
          onClick={() => { setDraft(null); onChange(shift(value, STEP)) }}
          className="flex h-full w-9 shrink-0 items-center justify-center rounded-r-md text-muted-foreground hover:bg-muted active:bg-muted disabled:pointer-events-none"
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {presets && presets.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setDraft(null); onChange(p) }}
              aria-pressed={value === p}
              className={cn(
                'h-7 rounded-full border px-2.5 text-xs tabular-nums transition-colors',
                value === p ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

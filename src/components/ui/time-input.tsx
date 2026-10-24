'use client'

import { cn } from '@/lib/utils'

// Input jam memakai <input type="time"> bawaan browser:
// - HP: muncul pemilih jam bawaan (roda/dial) yang sudah dikenal pengguna
// - Desktop: ketik per bagian (jam, menit, AM/PM) atau pilih lewat ikon jam
// - Format tampilan (12 jam AM/PM atau 24 jam) mengikuti pengaturan perangkat pengguna
// Nilai yang dikirim ke onChange selalu "" atau "HH:MM" 24 jam, apa pun format tampilannya.
// Tombol jam cepat (opsional) mempercepat pengisian jam yang umum.

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

function label(p: string) {
  // Tampil ringkas dan netral: 08:00 / 17:00
  return p
}

export function TimeInput({ value, onChange, id, disabled, required, presets, className, ...rest }: Props) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <input
        id={id}
        type="time"
        step={60}
        disabled={disabled}
        required={required}
        aria-label={rest['aria-label']}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm tabular-nums shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      />
      {presets && presets.length > 0 && !disabled && (
        <div className="flex flex-wrap gap-1">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-pressed={value === p}
              className={cn(
                'h-7 rounded-full border px-2.5 text-xs tabular-nums transition-colors',
                value === p ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              {label(p)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

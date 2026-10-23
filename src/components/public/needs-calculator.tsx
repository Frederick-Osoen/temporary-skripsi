'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { recommendKva, type GensetRule } from '@/lib/public/genset'
import { estimateNeeds, VENUE_LABEL, type Venue } from '@/lib/public/needs'
import { waLink } from '@/lib/public/business'
import { cn } from '@/lib/utils'

const VENUES = Object.keys(VENUE_LABEL) as Venue[]
const MAX_ICONS = 24

function Field({
  id,
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  night,
}: {
  id: string
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  night: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={cn('text-sm font-medium', night ? 'text-white/80' : 'text-foreground')}>
          {label}
        </label>
        <span className="flex items-baseline gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
            aria-label={`${label} (${unit})`}
            className={cn(
              'num w-20 rounded-md bg-transparent text-right text-2xl font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              night ? 'text-white' : 'text-ink'
            )}
          />
          <span className={cn('text-sm', night ? 'text-white/60' : 'text-muted-foreground')}>{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn('mt-3 h-10 w-full cursor-pointer', night ? 'accent-frost' : 'accent-primary')}
      />
    </div>
  )
}

export function NeedsCalculator({
  rules,
  waNumber,
  tone = 'night',
}: {
  rules: GensetRule[]
  waNumber: string
  tone?: 'night' | 'day'
}) {
  const uid = useId()
  const night = tone === 'night'
  const [venue, setVenue] = useState<Venue>('tenda')
  const [area, setArea] = useState(120)
  const [people, setPeople] = useState(200)

  const res = estimateNeeds({ areaM2: area, people, venue })
  const kva = res.acUnits > 0 ? recommendKva(res.acUnits, rules) : null
  const shown = Math.min(res.acUnits, MAX_ICONS)

  const message =
    `Halo JJ Teknik, saya ingin konsultasi kebutuhan AC.\n` +
    `Tempat: ${VENUE_LABEL[venue]}\nLuas: ±${area} m²\nTamu: ±${people} orang\n` +
    `Perkiraan dari kalkulator situs: ${res.acUnits} unit AC ${res.pk} PK` +
    (kva ? `, genset ${kva} kVA` : '')

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="space-y-7">
        <fieldset>
          <legend className={cn('text-sm font-medium', night ? 'text-white/80' : 'text-foreground')}>Jenis tempat</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {VENUES.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={venue === v}
                onClick={() => setVenue(v)}
                className={cn(
                  'focus-ink h-10 rounded-full border px-4 text-sm transition-colors',
                  venue === v
                    ? night ? 'border-frost bg-frost text-ink' : 'border-ink bg-ink text-white'
                    : night ? 'border-white/20 text-white/75 hover:border-white/45' : 'border-border text-muted-foreground hover:border-input'
                )}
              >
                {VENUE_LABEL[v]}
              </button>
            ))}
          </div>
        </fieldset>
        <Field id={`${uid}-area`} label="Luas area" unit="m²" value={area} min={10} max={2000} step={10} onChange={setArea} night={night} />
        <Field id={`${uid}-ppl`} label="Jumlah tamu" unit="orang" value={people} min={0} max={3000} step={10} onChange={setPeople} night={night} />
      </div>

      <div className={cn('rounded-2xl p-6 sm:p-8', night ? 'panel-night' : 'panel')} aria-live="polite">
        <p className={cn('text-sm', night ? 'text-white/65' : 'text-muted-foreground')}>Perkiraan kebutuhan</p>
        <p className="mt-2 flex items-baseline gap-3">
          <span className={cn('num text-7xl font-semibold', night ? 'text-frost' : 'text-primary')}>{res.acUnits}</span>
          <span className={cn('text-lg', night ? 'text-white/80' : 'text-foreground')}>unit AC standing {res.pk} PK</span>
        </p>

        {/* Satu ikon per unit: angka jadi terasa nyata */}
        <div className="mt-6 flex min-h-12 flex-wrap gap-1.5" aria-hidden="true">
          {Array.from({ length: shown }, (_, i) => (
            <span
              key={`${venue}-${i}`}
              className={cn('lamp-on block h-10 w-5 rounded-[5px] border-2', night ? 'border-frost/80 bg-frost/15' : 'border-primary/70 bg-primary/10')}
              style={{ animationDelay: `${i * 25}ms` }}
            />
          ))}
          {res.acUnits > MAX_ICONS && (
            <span className={cn('self-center pl-1 text-sm', night ? 'text-white/65' : 'text-muted-foreground')}>+{res.acUnits - MAX_ICONS}</span>
          )}
        </div>

        <dl className={cn('mt-6 grid grid-cols-2 gap-4 border-t pt-5 text-sm', night ? 'border-white/12' : 'border-border')}>
          <div>
            <dt className={night ? 'text-white/60' : 'text-muted-foreground'}>Genset yang disarankan</dt>
            <dd className={cn('num mt-1 text-2xl font-semibold', night ? 'text-volt' : 'text-ink')}>
              {kva ? `${kva} kVA` : res.acUnits === 0 ? '-' : rules.length === 0 ? 'Dihitung admin' : 'Custom'}
            </dd>
          </div>
          <div>
            <dt className={night ? 'text-white/60' : 'text-muted-foreground'}>Dasar hitungan</dt>
            <dd className={cn('mt-1', night ? 'text-white/80' : 'text-foreground')}>
              {VENUE_LABEL[venue]}, ±{area} m², ±{people} tamu
            </dd>
          </div>
        </dl>

        <p className={cn('mt-5 text-xs leading-relaxed', night ? 'text-white/55' : 'text-muted-foreground')}>
          Ini perkiraan kasar. Tinggi atap, ventilasi, dan jam acara ikut menentukan; admin akan memastikan jumlah
          finalnya.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link
            href="/katalog#sewa"
            className="focus-ink inline-flex h-11 items-center rounded-full bg-volt px-5 text-sm font-semibold text-volt-foreground"
          >
            Pilih unit di katalog
          </Link>
          <a
            href={waLink(waNumber, message)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'focus-ink inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium',
              night ? 'border-white/25 text-white hover:bg-white/10' : 'border-input hover:bg-muted'
            )}
          >
            <MessageCircle className="size-4" aria-hidden="true" /> Kirim hasil ke admin
          </a>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useId, useState } from 'react'
import { estimateBtu, SUN_LABEL, type Sun } from '@/lib/public/btu'

const field =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-base tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const fmt = (n: number) => n.toLocaleString('id-ID')

// Angka kosong dianggap 0 (bukan NaN) supaya hasil tidak pecah saat pengguna menghapus isi kolom.
const toNum = (s: string) => (s.trim() === '' ? 0 : Number(s.replace(',', '.')))

export function BtuCalculator() {
  const uid = useId()
  const [area, setArea] = useState('24')
  const [ceiling, setCeiling] = useState('3')
  const [people, setPeople] = useState('2')
  const [watt, setWatt] = useState('0')
  const [sun, setSun] = useState<Sun>('biasa')

  const r = estimateBtu({ areaM2: toNum(area), ceilingM: toNum(ceiling), people: toNum(people), equipmentWatt: toNum(watt), sun })

  return (
    <div className="not-prose my-8 rounded-2xl border bg-card p-5 sm:p-7">
      <h3 className="font-heading text-lg font-semibold">Hitung BTU ruangan Anda</h3>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-a`} className="text-sm font-medium">Luas ruangan (m²)</label>
          <input id={`${uid}-a`} className={field} inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-c`} className="text-sm font-medium">Tinggi plafon (m)</label>
          <input id={`${uid}-c`} className={field} inputMode="decimal" value={ceiling} onChange={(e) => setCeiling(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-p`} className="text-sm font-medium">Jumlah orang di dalam</label>
          <input id={`${uid}-p`} className={field} inputMode="numeric" value={people} onChange={(e) => setPeople(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-w`} className="text-sm font-medium">Peralatan listrik menyala (watt, total)</label>
          <input id={`${uid}-w`} className={field} inputMode="numeric" value={watt} onChange={(e) => setWatt(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor={`${uid}-s`} className="text-sm font-medium">Paparan matahari</label>
          <select id={`${uid}-s`} className={field} value={sun} onChange={(e) => setSun(e.target.value as Sun)}>
            {(Object.keys(SUN_LABEL) as Sun[]).map((k) => <option key={k} value={k}>{SUN_LABEL[k]}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-muted/70 p-4" aria-live="polite">
        <p className="text-sm text-muted-foreground">Perkiraan kebutuhan pendinginan</p>
        <p className="tnum mt-1 text-3xl font-semibold">{fmt(r.total)} <span className="text-base font-normal text-muted-foreground">BTU/jam</span></p>
        <p className="mt-1 text-sm">Setara ±<strong>{r.pk.toLocaleString('id-ID')} PK</strong>{r.standing5pk > 0 && <> atau ±<strong>{r.standing5pk}</strong> unit AC standing 5 PK</>}.</p>
        <dl className="tnum mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div><dt>Luas &amp; plafon</dt><dd className="text-sm text-foreground">{fmt(r.base)}</dd></div>
          <div><dt>Orang</dt><dd className="text-sm text-foreground">{fmt(r.people)}</dd></div>
          <div><dt>Peralatan</dt><dd className="text-sm text-foreground">{fmt(r.equipment)}</dd></div>
        </dl>
      </div>
    </div>
  )
}

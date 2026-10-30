'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { saveGensetRules } from '@/app/dashboard/settings/genset-actions'
import { safeAction } from '@/lib/action-client'
import { validateGensetRules, type GensetRule } from '@/lib/public/genset'

type Row = { key: number; min: string; max: string; kva: string }

const input =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

let seq = 0
const toRow = (r: GensetRule): Row => ({ key: ++seq, min: String(r.min_ac), max: r.max_ac === null ? '' : String(r.max_ac), kva: String(r.kva) })

export function GensetRulesEditor({ initial, canEdit, ready }: { initial: GensetRule[]; canEdit: boolean; ready: boolean }) {
  const [rows, setRows] = useState<Row[]>(() => [...initial].sort((a, b) => a.min_ac - b.min_ac).map(toRow))
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const off = !canEdit || !ready || pending

  const patch = (key: number, f: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...f } : r)))

  function add() {
    // Saran otomatis: mulai satu unit setelah batas atas terakhir
    const last = rows.map((r) => (r.max === '' ? NaN : Number(r.max))).filter(Number.isFinite)
    const next = last.length ? Math.max(...last) + 1 : 1
    setRows((rs) => [...rs, { key: ++seq, min: String(next), max: '', kva: '' }])
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const parsed: GensetRule[] = []
    for (const [i, r] of rows.entries()) {
      const min = Number(r.min), kva = Number(r.kva)
      const max = r.max.trim() === '' ? null : Number(r.max)
      if (!r.min.trim() || !Number.isInteger(min) || !r.kva.trim() || !Number.isInteger(kva) || (max !== null && !Number.isInteger(max))) {
        return setMsg({ ok: false, text: `Baris ${i + 1}: isi semua kolom dengan bilangan bulat (batas atas boleh dikosongkan).` })
      }
      parsed.push({ min_ac: min, max_ac: max, kva })
    }
    const problem = validateGensetRules(parsed)
    if (problem) return setMsg({ ok: false, text: problem })
    start(async () => {
      const res = await safeAction(() => saveGensetRules(parsed))
      setMsg(res.ok ? { ok: true, text: 'Aturan genset tersimpan. Kalkulator dan estimator langsung memakainya.' } : { ok: false, text: res.error })
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-background p-4 sm:p-6">
      <div>
        <h2 className="text-base font-semibold">Aturan genset</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Menentukan kapasitas genset yang disarankan berdasarkan total unit AC. Dipakai kalkulator dan estimator di situs publik.
          Kosongkan &quot;Sampai&quot; pada baris terakhir bila tidak ada batas atas. Jumlah AC di atas batas aturan tertinggi akan ditandai &quot;dihitung manual oleh admin&quot;.
        </p>
      </div>

      {!ready && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Jalankan <code>fase-10a.sql</code> di Supabase agar aturan genset bisa disimpan dari sini.
        </p>
      )}

      <div className="space-y-2">
        <div className="hidden grid-cols-[1fr_1fr_1fr_2.5rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
          <span>Mulai dari (unit AC)</span><span>Sampai (unit AC)</span><span>Genset (kVA)</span><span />
        </div>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Belum ada aturan. Tanpa aturan, kapasitas genset ditandai &quot;dihitung admin&quot;.</p>}
        {rows.map((r, i) => (
          <div key={r.key} className="grid grid-cols-3 gap-2 sm:grid-cols-[1fr_1fr_1fr_2.5rem]">
            <input aria-label={`Baris ${i + 1}: mulai dari`} className={input} inputMode="numeric" value={r.min} onChange={(e) => patch(r.key, { min: e.target.value })} disabled={off} />
            <input aria-label={`Baris ${i + 1}: sampai`} className={input} inputMode="numeric" placeholder="tanpa batas" value={r.max} onChange={(e) => patch(r.key, { max: e.target.value })} disabled={off} />
            <input aria-label={`Baris ${i + 1}: kVA`} className={input} inputMode="numeric" value={r.kva} onChange={(e) => patch(r.key, { kva: e.target.value })} disabled={off} />
            <Button type="button" variant="ghost" size="icon" aria-label={`Hapus baris ${i + 1}`} disabled={off} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="col-span-3 sm:col-span-1">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-md px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-destructive/10 text-destructive'}`}>
          {msg.text}
        </p>
      )}

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={add} disabled={off || rows.length >= 20}><Plus className="mr-1 size-4" />Tambah aturan</Button>
          <Button type="submit" disabled={off}>{pending ? 'Menyimpan…' : 'Simpan aturan genset'}</Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Hanya owner yang dapat mengubah aturan genset.</p>
      )}
    </form>
  )
}

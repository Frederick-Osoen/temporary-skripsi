'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { saveAllocation } from '@/app/dashboard/orders/actions'
import { safeAction } from '@/lib/action-client'
import {
  autoPickUnits, isFreeUnit,
  type AllocationData, type AllocationItem, type AllocationUnit, type UnitStatus,
} from '@/lib/orders/allocation'
import { formatDate } from '@/lib/orders/utils'
import { cn } from '@/lib/utils'
import { addDays } from '@/lib/orders/utils'

const STATUS_TEXT: Record<UnitStatus, string> = {
  available: 'Tersedia', allocated: 'Dialokasikan', maintenance: 'Maintenance', damaged: 'Rusak',
}

type VendorDraft = { vendor_name: string; count: number | null }
type Draft = { selected: string[]; vendors: VendorDraft[] }

export function AllocationDialog({
  data, open, onOpenChange,
}: { data: AllocationData; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Alokasi Unit</DialogTitle>
          <DialogDescription>
            Unit dikunci pada periode {formatDate(data.setup_date)} – {formatDate(addDays(data.end_date, 1))} (pemasangan sampai pembongkaran H+1).
          </DialogDescription>
        </DialogHeader>
        {/* key version: form dibuat ulang dengan data terbaru setelah "Muat data terbaru" */}
        {open && <AllocationForm key={data.version} data={data} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function AllocationForm({ data, onDone }: { data: AllocationData; onDone: () => void }) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      data.items.map((i) => [i.order_item_id, { selected: [...i.unit_ids], vendors: i.outsourced.map((v) => ({ ...v })) }])
    )
  )
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [pending, startTransition] = useTransition()

  const outOf = (d: Draft) => d.vendors.reduce((s, v) => s + (v.count ?? 0), 0)
  const over = data.items.some((i) => {
    const d = drafts[i.order_item_id]
    return d.selected.length + outOf(d) > i.qty
  })
  const totalNeeded = data.items.reduce((s, i) => s + i.qty, 0)
  const totalFilled = data.items.reduce((s, i) => {
    const d = drafts[i.order_item_id]
    return s + d.selected.length + outOf(d)
  }, 0)

  function submit() {
    setError(null)
    setConflict(false)
    const items = data.items.map((i) => {
      const d = drafts[i.order_item_id]
      return {
        order_item_id: i.order_item_id,
        unit_ids: d.selected,
        outsourced: d.vendors
          .filter((v) => (v.count ?? 0) > 0)
          .map((v) => ({ vendor_name: v.vendor_name.trim(), count: v.count as number })),
      }
    })
    if (items.some((i) => i.outsourced.some((v) => v.vendor_name.length < 2))) {
      return setError('Isi nama vendor untuk unit outsourcing.')
    }

    startTransition(async () => {
      const res = await safeAction(() => saveAllocation({ order_id: data.order_id, version: data.version, items }))
      if (res.ok) return onDone()
      setError(res.error)
      setConflict(res.code === 'CONFLICT' || res.code === 'UNAVAILABLE')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-primary" />Dipilih</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border" />Tersedia (angka = total sewa)</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border border-dashed opacity-50" />Terpakai pesanan lain / maintenance / rusak</span>
      </div>

      {data.items.map((item) => (
        <ItemEditor
          key={item.order_item_id}
          item={item}
          draft={drafts[item.order_item_id]}
          onChange={(d) => setDrafts((prev) => ({ ...prev, [item.order_item_id]: d }))}
        />
      ))}

      {error && (
        <div role="alert" className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          {conflict && (
            <Button type="button" size="sm" variant="outline" onClick={() => { onDone(); router.refresh() }}>
              Muat data terbaru
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-sm text-muted-foreground">
          Terisi {totalFilled} dari {totalNeeded} unit. Boleh disimpan walau belum lengkap.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>Batal</Button>
          <Button type="button" onClick={submit} disabled={pending || over}>
            {pending ? 'Menyimpan...' : 'Simpan Alokasi'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ItemEditor({
  item, draft, onChange,
}: { item: AllocationItem; draft: Draft; onChange: (d: Draft) => void }) {
  const selectedSet = new Set(draft.selected)
  const out = draft.vendors.reduce((s, v) => s + (v.count ?? 0), 0)
  const remaining = item.qty - draft.selected.length - out
  const freeLeft = item.units.filter((u) => isFreeUnit(u) && !selectedSet.has(u.id)).length

  function toggle(u: AllocationUnit) {
    if (selectedSet.has(u.id)) {
      return onChange({ ...draft, selected: draft.selected.filter((x) => x !== u.id) })
    }
    if (remaining <= 0) return
    onChange({ ...draft, selected: [...draft.selected, u.id] })
  }

  function autoFill() {
    onChange({ ...draft, selected: [...draft.selected, ...autoPickUnits(item.units, selectedSet, remaining)] })
  }

  function setVendor(idx: number, patch: Partial<VendorDraft>) {
    onChange({ ...draft, vendors: draft.vendors.map((v, i) => (i === idx ? { ...v, ...patch } : v)) })
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{item.product_name}</p>
          <p className="text-xs text-muted-foreground">
            Butuh {item.qty} unit · internal {draft.selected.length} · vendor {out}
          </p>
        </div>
        {remaining === 0 && <Badge className="border-green-300 bg-green-100 text-green-800" variant="outline">Lengkap</Badge>}
        {remaining > 0 && <Badge className="border-amber-300 bg-amber-100 text-amber-800" variant="outline">Kurang {remaining} unit</Badge>}
        {remaining < 0 && <Badge variant="destructive">Berlebih {-remaining} unit</Badge>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={autoFill} disabled={remaining <= 0 || freeLeft === 0}>
          <Wand2 className="mr-2 h-4 w-4" /> Pilih otomatis
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...draft, selected: [] })} disabled={draft.selected.length === 0}>
          Kosongkan unit
        </Button>
      </div>

      {remaining > freeLeft && (
        <p className="text-xs text-amber-700">
          Unit internal yang tersedia untuk tanggal ini hanya {freeLeft}. Sisanya bisa dipenuhi lewat vendor outsourcing.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
        {item.units.map((u) => {
          const selected = selectedSet.has(u.id)
          const reason = u.busy
            ? `Dipakai ${u.busy.order_code} (${u.busy.customer}), ${formatDate(u.busy.setup_date)} – ${formatDate(u.busy.end_date)}`
            : u.status !== 'available'
              ? `Status: ${STATUS_TEXT[u.status]}`
              : null
          const blocked = !selected && (!!reason || remaining <= 0)

          return (
            <button
              key={u.id}
              type="button"
              onClick={() => toggle(u)}
              disabled={blocked}
              aria-pressed={selected}
              title={reason ?? `${u.total_count}x disewa`}
              className={cn(
                'rounded-md border px-2 py-1 text-left text-xs transition-colors',
                selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
                reason && !selected && 'cursor-not-allowed border-dashed text-muted-foreground opacity-50',
                selected && reason && 'ring-2 ring-destructive'
              )}
            >
              <span className="block font-medium">{u.code}</span>
              <span className="block opacity-70">{reason ? (u.busy ? 'Terpakai' : STATUS_TEXT[u.status]) : `${u.total_count}x`}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Outsourcing (unit dari vendor)</p>
        {draft.vendors.map((v, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              placeholder="Nama vendor"
              maxLength={150}
              value={v.vendor_name}
              onChange={(e) => setVendor(idx, { vendor_name: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="w-24"
              aria-label="Jumlah unit vendor"
              value={v.count ?? ''}
              onChange={(e) => setVendor(idx, { count: e.target.value === '' ? null : Number(e.target.value) })}
            />
            <Button
              type="button" variant="ghost" size="icon" aria-label="Hapus vendor"
              onClick={() => onChange({ ...draft, vendors: draft.vendors.filter((_, i) => i !== idx) })}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button
          type="button" size="sm" variant="outline"
          onClick={() => onChange({ ...draft, vendors: [...draft.vendors, { vendor_name: '', count: remaining > 0 ? remaining : 1 }] })}
        >
          <Plus className="mr-2 h-4 w-4" /> Tambah vendor
        </Button>
      </div>
    </div>
  )
}
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { logMaintenance } from '@/app/dashboard/assets/actions'
import { safeAction } from '@/lib/action-client'
import type { AssetRow } from '@/lib/validations/asset'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Tanggal hari ini dalam zona WIB (format YYYY-MM-DD)
const todayWIB = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
export function MaintenanceForm({ asset, onDone }: { asset: AssetRow; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const input = {
      unit_asset_id: asset.id,
      type: fd.get('type'),
      service_date: fd.get('service_date'),
      description: fd.get('description') ?? '',
    }
    startTransition(async () => {
      const res = await safeAction(() => logMaintenance(input))
      if (res.ok) onDone()
      else setError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {asset.asset_code} · total sewa saat ini <strong>{asset.total_count}x</strong>
      </p>

      <div className="space-y-2">
        <Label htmlFor="type">Jenis service</Label>
        <select id="type" name="type" className={selectClass} defaultValue="service_kecil">
          <option value="service_kecil">Cuci / Service Kecil</option>
          <option value="service_besar">Service Besar</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_date">Tanggal</Label>
        <Input id="service_date" name="service_date" type="date" required defaultValue={todayWIB()} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Catatan (opsional)</Label>
        <Input id="description" name="description" maxLength={500} placeholder="Contoh: ganti kapasitor" />
      </div>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>Batal</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Menyimpan...' : 'Catat Service'}</Button>
      </div>
    </form>
  )
}
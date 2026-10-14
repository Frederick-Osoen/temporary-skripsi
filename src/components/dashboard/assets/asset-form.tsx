'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAsset, updateAsset } from '@/app/dashboard/assets/actions'
import { safeAction } from '@/lib/action-client'
import { ASSET_STATUSES, type AssetRow, type ProductOption } from '@/lib/validations/asset'

export const STATUS_LABEL: Record<AssetRow['status'], string> = {
  available: 'Tersedia',
  allocated: 'Dialokasikan',
  maintenance: 'Maintenance',
  damaged: 'Rusak',
}

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AssetForm({
  asset,
  products,
  onDone,
}: {
  asset: AssetRow | null
  products: ProductOption[]
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [needsRefresh, setNeedsRefresh] = useState(false) // BARU

  const statusOptions = ASSET_STATUSES.filter((s) => s !== 'allocated' || asset?.status === 'allocated')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNeedsRefresh(false)
    const fd = new FormData(e.currentTarget)
    const input = {
      product_id: fd.get('product_id') ?? asset?.product_id,
      asset_code: fd.get('asset_code'),
      initial_count: fd.get('initial_count'),
      status: fd.get('status'),
    }

    startTransition(async () => {
      const res = await safeAction(() => (asset ? updateAsset(asset.id, asset.version, input) : createAsset(input)))
      if (res.ok) { onDone(); return }
      setError(res.error)
      if (res.code === 'CONFLICT' || res.code === 'UNAVAILABLE') setNeedsRefresh(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product_id">Produk</Label>
        {asset ? (
          <p className="text-sm">{asset.product_name}</p>
        ) : (
          <select id="product_id" name="product_id" required className={selectClass} defaultValue="">
            <option value="" disabled>Pilih produk rental</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset_code">Kode aset</Label>
        <Input id="asset_code" name="asset_code" required placeholder="AC-51" defaultValue={asset?.asset_code} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="initial_count">Hitungan sewa awal</Label>
          <Input id="initial_count" name="initial_count" type="number" min={0} step={1} required defaultValue={asset?.initial_count ?? 0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" className={selectClass} defaultValue={asset?.status ?? 'available'}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Hitungan awal = berapa kali unit sudah disewa sebelum sistem ini dipakai. Unit baru dianggap sudah bersih pada hitungan ini.
      </p>

      {error && (
        <div role="alert" className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          {needsRefresh && (
            <Button type="button" size="sm" variant="outline" onClick={() => router.refresh()}>
              Muat data terbaru
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>Batal</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan'}</Button>
      </div>
    </form>
  )
}
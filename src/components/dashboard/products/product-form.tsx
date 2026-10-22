'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProduct, updateProduct } from '@/app/dashboard/products/actions'
import { safeAction } from '@/lib/action-client'
import { RupiahInput } from '@/components/ui/rupiah-input'
import type { Product } from '@/lib/validations/product'


const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ProductForm({ product, onDone }: { product: Product | null; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [price, setPrice] = useState<number | null>(product?.base_price ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [overtime, setOvertime] = useState<number | null>(product?.overtime_rate ?? null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const input = {
      name: fd.get('name'),
      category: fd.get('category'),
      base_price: fd.get('base_price'),
      total_stock: fd.get('total_stock'),
      overtime_rate: fd.get('overtime_rate'),
    }
    startTransition(async () => {
      const res = await safeAction(() => (product ? updateProduct(product.id, input) : createProduct(input)))
      if (res.ok) onDone()
      else setError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama produk</Label>
        <Input id="name" name="name" required defaultValue={product?.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategori</Label>
        <select id="category" name="category" className={selectClass} defaultValue={product?.category ?? 'rental'}>
          <option value="rental">Rental</option>
          <option value="sales">Sales</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="base_price">Harga dasar (Rp)</Label>
          <RupiahInput id="base_price" name="base_price" value={price} onValueChange={setPrice} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_stock">Stok</Label>
          <Input id="total_stock" name="total_stock" type="number" min={0} step={1} required defaultValue={product?.total_stock ?? 0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="overtime_rate">Tarif overtime per jam per unit (Rp, opsional)</Label>
          <RupiahInput id="overtime_rate" name="overtime_rate" value={overtime} onValueChange={setOvertime} placeholder="Kosongkan jika tidak ada overtime" />
          <p className="text-xs text-muted-foreground">Isi untuk produk yang dikenai overtime (mis. genset) bila pemakaian lebih dari 8 jam per hari.</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Untuk produk rental, stok sebaiknya sama dengan jumlah unit fisik di menu Aset Fisik.
      </p>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>Batal</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan'}</Button>
      </div>
    </form>
  )
}
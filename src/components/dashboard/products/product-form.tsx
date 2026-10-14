'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProduct, updateProduct } from '@/app/dashboard/products/actions'
import { safeAction } from '@/lib/action-client'
import type { Product } from '@/lib/validations/product'


const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ProductForm({ product, onDone }: { product: Product | null; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const input = {
      name: fd.get('name'),
      category: fd.get('category'),
      base_price: fd.get('base_price'),
      total_stock: fd.get('total_stock'),
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
          <Input id="base_price" name="base_price" type="number" min={0} step={1000} required defaultValue={product?.base_price ?? 0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="total_stock">Stok</Label>
          <Input id="total_stock" name="total_stock" type="number" min={0} step={1} required defaultValue={product?.total_stock ?? 0} />
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
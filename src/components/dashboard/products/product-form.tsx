'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProduct, updateProduct } from '@/app/dashboard/products/actions'
import { safeAction } from '@/lib/action-client'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { ImageUploader } from './image-uploader'
import type { Product } from '@/lib/validations/product'

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function Toggle({
  id, checked, onChange, label, hint,
}: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-input accent-[var(--primary)]"
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}

export function ProductForm({ product, onDone }: { product: Product | null; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [category, setCategory] = useState<'rental' | 'sales'>(product?.category ?? 'rental')
  const [price, setPrice] = useState<number | null>(product?.base_price ?? 0)
  const [overtime, setOvertime] = useState<number | null>(product?.overtime_rate ?? null)
  const [imagePath, setImagePath] = useState<string | null>(product?.image_path ?? null)
  const [uploading, setUploading] = useState(false)
  const [isPublic, setIsPublic] = useState(product?.is_public ?? true)
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const input = {
      name: fd.get('name'),
      category,
      base_price: fd.get('base_price'),
      total_stock: fd.get('total_stock'),
      overtime_rate: fd.get('overtime_rate'),
      image_path: imagePath,
      description: fd.get('description'),
      // kVA hanya berlaku untuk produk rental; untuk sales selalu dikosongkan
      capacity_kva: category === 'rental' ? fd.get('capacity_kva') : null,
      is_public: isPublic,
      is_featured: isFeatured,
      sort_order: fd.get('sort_order'),
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
        <Label>Foto produk</Label>
        <ImageUploader value={imagePath} onChange={setImagePath} onBusyChange={setUploading} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nama produk</Label>
        <Input id="name" name="name" required defaultValue={product?.name} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi untuk katalog (opsional)</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={product?.description ?? ''}
          placeholder="Mis. AC Standing 2 PK, cocok untuk ruangan hingga 40 m²."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">Maksimal 500 karakter. Kosongkan untuk memakai teks bawaan.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategori</Label>
        <select
          id="category"
          name="category"
          className={selectClass}
          value={category}
          onChange={(e) => setCategory(e.target.value as 'rental' | 'sales')}
        >
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
      </div>

      {category === 'rental' && (
        <div className="grid gap-4 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="capacity_kva">Kapasitas genset (kVA)</Label>
            <Input
              id="capacity_kva"
              name="capacity_kva"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              defaultValue={product?.capacity_kva ?? ''}
              placeholder="Kosongkan jika bukan genset"
            />
            <p className="text-xs text-muted-foreground">Isi hanya untuk genset. Dipakai untuk rekomendasi otomatis di halaman estimasi.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="overtime_rate">Tarif overtime per jam per unit (Rp)</Label>
            <RupiahInput id="overtime_rate" name="overtime_rate" value={overtime} onValueChange={setOvertime} placeholder="Kosongkan jika tidak ada" />
            <p className="text-xs text-muted-foreground">Untuk produk yang dikenai overtime (mis. genset) bila lebih dari 8 jam per hari.</p>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Untuk produk rental, stok sebaiknya sama dengan jumlah unit fisik di menu Aset Fisik.
      </p>

      <div className="space-y-3">
        <p className="text-sm font-medium">Tampilan di katalog publik</p>
        <Toggle
          id="is_public"
          checked={isPublic}
          onChange={setIsPublic}
          label="Tampilkan di katalog dan estimasi"
          hint="Matikan untuk menyembunyikan produk dari pelanggan. Pesanan lama dan menu admin tidak terpengaruh."
        />
        <Toggle
          id="is_featured"
          checked={isFeatured}
          onChange={setIsFeatured}
          label="Produk unggulan"
          hint="Ditampilkan di bagian unggulan beranda."
        />
        <div className="max-w-40 space-y-2">
          <Label htmlFor="sort_order">Urutan tampil</Label>
          <Input id="sort_order" name="sort_order" type="number" min={0} max={9999} step={1} defaultValue={product?.sort_order ?? 0} />
          <p className="text-xs text-muted-foreground">Angka kecil tampil lebih dulu dalam kelompoknya.</p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>Batal</Button>
        <Button type="submit" disabled={pending || uploading}>{pending ? 'Menyimpan...' : 'Simpan'}</Button>
      </div>
    </form>
  )
}

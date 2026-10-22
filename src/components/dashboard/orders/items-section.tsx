'use client'

import { useMemo, useState } from 'react'
import { Controller, useFieldArray, useFormContext } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { formatRupiah, lineSubtotal } from '@/lib/orders/utils'
import type { OrderFormValues, OrderProduct } from '@/lib/validations/order'
import { FieldError, Section, selectClass } from './ui'

export function ItemsSection({ products, days }: { products: OrderProduct[]; days: number }) {
  const { control, register, watch, formState: { errors } } = useFormContext<OrderFormValues>()
  const { fields, append, remove, update } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const [selected, setSelected] = useState('')

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  function addProduct() {
    const p = byId.get(selected)
    if (!p) return
    const idx = items.findIndex((i) => i.product_id === p.id)
    if (idx >= 0) {
      // Produk sudah ada: tambah qty, jangan duplikat baris
      update(idx, { ...items[idx], qty: Math.min((Number(items[idx].qty) || 0) + 1, 1000) })
    } else {
      append({ line_id: null, product_id: p.id, qty: 1, unit_price: p.base_price })
    }
    setSelected('')
  }

  return (
    <Section title="Keranjang Item">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          aria-label="Pilih produk"
          className={selectClass}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Pilih produk...</option>
          <optgroup label="Rental">
            {products.filter((p) => p.category === 'rental').map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {formatRupiah(p.base_price)}</option>
            ))}
          </optgroup>
          <optgroup label="Sales">
            {products.filter((p) => p.category === 'sales').map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {formatRupiah(p.base_price)}</option>
            ))}
          </optgroup>
        </select>
        <Button type="button" onClick={addProduct} disabled={!selected} className="sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Tambah
        </Button>
      </div>

      <FieldError message={errors.items?.root?.message ?? errors.items?.message} />

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
          Belum ada produk di keranjang.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const product = byId.get(field.product_id)
            const row = items[index]
            const qty = Number(row?.qty) || 0
            const price = Number(row?.unit_price) || 0
            const isRental = product?.category === 'rental'
            const subtotal = lineSubtotal({ qty, unit_price: price, is_rental: !!isRental }, days)
            const overStock = product && qty > product.total_stock
            const priceChanged = product && price !== product.base_price

            return (
              <div key={field.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{product?.name ?? 'Produk tidak ditemukan'}</p>
                    {product && (
                      <Badge variant={product.category === 'rental' ? 'default' : 'secondary'} className="capitalize">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Hapus item" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor={`qty-${index}`}>Jumlah</Label>
                    <Input
                      id={`qty-${index}`}
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      {...register(`items.${index}.qty`, { valueAsNumber: true })}
                    />
                    <FieldError message={errors.items?.[index]?.qty?.message} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`price-${index}`}>{isRental ? 'Harga per hari (Rp)' : 'Harga satuan (Rp)'}</Label>
                    <Controller
                      control={control}
                      name={`items.${index}.unit_price`}
                      render={({ field }) => (
                        <RupiahInput id={`price-${index}`} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
                      )}
                    />
                    <FieldError message={errors.items?.[index]?.unit_price?.message} />
                  </div>
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label>Subtotal</Label>
                    <p className="flex h-9 items-center text-sm font-medium">{formatRupiah(subtotal)}</p>
                    {isRental && days > 1 && (
                      <p className="text-xs text-muted-foreground">{qty} × {formatRupiah(price)} × {days} hari</p>
                    )}
                  </div>
                </div>

                {priceChanged && (
                  <p className="mt-2 text-xs text-muted-foreground">Harga dasar: {formatRupiah(product.base_price)} (diubah manual)</p>
                )}
                {overStock && (
                  <p className="mt-1 text-xs text-amber-700">
                    {product.category === 'rental'
                      ? `Melebihi jumlah unit (${product.total_stock}). Perlu outsourcing vendor.`
                      : `Melebihi stok tercatat (${product.total_stock}).`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}
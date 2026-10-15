'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createOrder, updateOrder } from '@/app/dashboard/orders/actions'
import { safeAction, type ActionFail } from '@/lib/action-client'
import { addDays, calcItemsTotal, formatRupiah, rentalDays, resolveShipping } from '@/lib/orders/utils'
import { orderFormSchema, type OrderFormValues, type OrderProduct } from '@/lib/validations/order'
import { CustomerSection } from './customer-section'
import { ItemsSection } from './items-section'
import { ShippingSection } from './shipping-section'
import { FieldError, Section } from './ui'

const DEFAULTS: OrderFormValues = {
  phone: '',
  customer_name: '',
  customer_type: 'regular',
  delivery_mode: 'delivery',
  destination: '',
  fleet_type: 'pickup',
  start_date: '',
  end_date: '',
  setup_date: '',
  items: [],
  shipping: { zone: 0, distance_km: 0, auto_fuel_fee: 0, auto_toll_fee: 0, toll_override: null, manual_shipping_fee: null },
}

type Props = {
  products: OrderProduct[]
  mode?: 'create' | 'edit'
  initialValues?: OrderFormValues
  orderId?: string
  version?: number
}

export function OrderForm({ products, mode = 'create', initialValues, orderId, version }: Props) {
  const isEdit = mode === 'edit'
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const submitting = useRef(false) // pengaman klik ganda
  const setupTouched = useRef(isEdit) // mode edit: jangan timpa tanggal pasang yang tersimpan

  const methods = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: initialValues ?? DEFAULTS,
    reValidateMode: 'onChange',
  })
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = methods

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const values = watch()
  const hasRental = values.items.some((i) => productsById.get(i.product_id)?.category === 'rental')
  const startDate = values.start_date

  // Sinkronisasi tanggal: sales saja = satu tanggal; rental: setup default H-1
  useEffect(() => {
    if (!startDate) return
    if (!hasRental) {
      setValue('end_date', startDate)
      setValue('setup_date', startDate)
      return
    }
    const end = getValues('end_date')
    if (!end || end < startDate) setValue('end_date', startDate)
    if (!setupTouched.current || getValues('setup_date') > startDate) {
      setValue('setup_date', addDays(startDate, -1))
    }
  }, [startDate, hasRental, setValue, getValues])

  // Durasi sewa inklusif (rental saja)
  const days = hasRental && values.start_date && values.end_date ? rentalDays(values.start_date, values.end_date) : 1
  const itemsTotal = calcItemsTotal(
    values.items.map((i) => ({
      qty: Number(i.qty) || 0,
      unit_price: Number(i.unit_price) || 0,
      is_rental: productsById.get(i.product_id)?.category === 'rental',
    })),
    days
  )
  const shipping = resolveShipping(values.delivery_mode, values.shipping)
  const shippingFee = shipping.ok ? shipping.value.shipping_fee : 0
  const grandTotal = itemsTotal + shippingFee

  function onFail(res: ActionFail) {
    submitting.current = false
    setSubmitError(res.error)
    setConflict(res.code === 'CONFLICT')
  }

  const onSubmit = handleSubmit((data) => {
    if (submitting.current) return
    submitting.current = true
    setSubmitError(null)
    setConflict(false)

    startTransition(async () => {
      if (isEdit && orderId && version !== undefined) {
        const res = await safeAction(() => updateOrder(orderId, version, data))
        if (res.ok) {
          router.push(`/dashboard/orders/${orderId}?updated=1`)
          return
        }
        onFail(res)
      } else {
        const res = await safeAction(() => createOrder(data))
        if (res.ok) {
          router.push(`/dashboard/orders?created=${encodeURIComponent(res.data.code)}`)
          return
        }
        onFail(res)
      }
    })
  })

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {isEdit ? (
            <Section title="Pelanggan">
              <p className="text-sm">
                <span className="font-medium">{values.customer_name}</span>{' '}
                <span className="text-muted-foreground">· {values.phone}</span>
              </p>
              <p className="text-xs text-muted-foreground">Data pelanggan tidak diubah dari halaman ini.</p>
            </Section>
          ) : (
            <CustomerSection />
          )}

          <ItemsSection products={products} days={days} />
          <ShippingSection hasRental={hasRental} initialManual={isEdit && initialValues?.shipping.zone === 3} />

          <Section title="Jadwal">
            {hasRental ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Tanggal mulai acara</Label>
                  <Input id="start_date" type="date" {...register('start_date')} />
                  <FieldError message={errors.start_date?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Tanggal selesai</Label>
                  <Input id="end_date" type="date" {...register('end_date')} />
                  <FieldError message={errors.end_date?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup_date">Tanggal pasang (H-1)</Label>
                  <Input
                    id="setup_date"
                    type="date"
                    {...register('setup_date', { onChange: () => { setupTouched.current = true } })}
                  />
                  <FieldError message={errors.setup_date?.message} />
                </div>
              </div>
            ) : (
              <div className="max-w-xs space-y-2">
                <Label htmlFor="start_date">Tanggal pengiriman / pengambilan</Label>
                <Input id="start_date" type="date" {...register('start_date')} />
                <FieldError message={errors.start_date?.message} />
              </div>
            )}
            {hasRental && values.start_date && values.end_date && values.end_date >= values.start_date && (
              <p className="text-sm font-medium">Durasi sewa: {days} hari</p>
            )}
            <p className="text-xs text-muted-foreground">
              Jam operasional harian dan overtime genset diatur pada tahap berikutnya.
            </p>
          </Section>
        </div>

        <aside className="lg:col-span-1">
          <div className="space-y-4 rounded-lg border bg-background p-4 lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold">Ringkasan</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal item{hasRental && days > 1 ? ` (rental × ${days} hari)` : ''}</span>
                <span>{formatRupiah(itemsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkir</span>
                <span>{shipping.ok ? formatRupiah(shippingFee) : '-'}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{formatRupiah(grandTotal)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Total final dihitung ulang oleh server saat disimpan.
              {!isEdit && ' Status awal: Menunggu DP.'}
            </p>

            {submitError && (
              <div role="alert" className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <p>{submitError}</p>
                {conflict && (
                  <Button type="button" size="sm" variant="outline" onClick={() => router.refresh()}>
                    Muat data terbaru
                  </Button>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Pesanan'}
            </Button>
            <Link
              href={isEdit && orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders'}
              className="block text-center text-sm text-muted-foreground hover:underline"
            >
              Batal
            </Link>
          </div>
        </aside>
      </form>
    </FormProvider>
  )
}
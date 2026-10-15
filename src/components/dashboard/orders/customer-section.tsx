'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { findCustomerByPhone } from '@/app/dashboard/orders/actions'
import { safeAction } from '@/lib/action-client'
import { normalizePhone } from '@/lib/phone'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { OrderFormValues } from '@/lib/validations/order'
import { FieldError, Section, selectClass } from './ui'

type LookupState = 'idle' | 'searching' | 'found' | 'new' | 'error'

export function CustomerSection() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<OrderFormValues>()
  const [state, setState] = useState<LookupState>('idle')
  const foundPhone = useRef<string | null>(null)
  const seq = useRef(0)

  const phone = watch('phone')
  const customerType = watch('customer_type')
  const normalized = normalizePhone(phone ?? '')
  const debounced = useDebouncedValue(normalized, 500)

  // Tampilan: sedang mengetik (belum di-debounce) dianggap "mencari"
  const effective: LookupState = !normalized ? 'idle' : normalized !== debounced ? 'searching' : state

  // Nomor diubah setelah pelanggan ditemukan: lepaskan auto-fill seketika
  useEffect(() => {
    if (foundPhone.current && normalized !== foundPhone.current) {
      foundPhone.current = null
      setState('idle')
      setValue('customer_name', '')
      setValue('customer_type', 'regular')
    }
  }, [normalized, setValue])

  // Pencarian (setelah debounce)
  useEffect(() => {
    if (!debounced) return
    const id = ++seq.current
    setState('searching')

    void (async () => {
      const res = await safeAction(() => findCustomerByPhone(debounced))
      if (id !== seq.current) return // respons basi, abaikan
      if (!res.ok) {
        setState('error')
        return
      }
      if (res.data) {
        foundPhone.current = debounced
        setValue('customer_name', res.data.name, { shouldValidate: true })
        setValue('customer_type', res.data.type)
        setState('found')
      } else {
        foundPhone.current = null
        setState('new')
      }
    })()

    return () => {
      seq.current++
    }
  }, [debounced, setValue])

  const found = effective === 'found'

  return (
    <Section title="Pelanggan">
      <div className="space-y-2">
        <Label htmlFor="phone">Nomor WhatsApp</Label>
        <Input id="phone" inputMode="tel" autoComplete="off" placeholder="0812 3456 7890" {...register('phone')} />
        <FieldError message={errors.phone?.message} />
        {effective === 'searching' && <p className="text-xs text-muted-foreground">Mencari pelanggan...</p>}
        {effective === 'found' && <p className="text-xs text-green-700">Pelanggan terdaftar. Data terisi otomatis.</p>}
        {effective === 'new' && (
          <p className="text-xs text-blue-700">Pelanggan baru. Akan dibuat otomatis saat pesanan disimpan.</p>
        )}
        {effective === 'error' && (
          <p className="text-xs text-amber-700">Gagal mencari pelanggan. Isi nama secara manual.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer_name">Nama pelanggan</Label>
          <Input id="customer_name" readOnly={found} className={found ? 'bg-muted' : undefined} {...register('customer_name')} />
          <FieldError message={errors.customer_name?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_type">Tipe pelanggan</Label>
          {found ? (
            <p className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm capitalize">
              {customerType === 'corporate' ? 'Corporate (B2B)' : 'Regular'}
            </p>
          ) : (
            <select id="customer_type" className={selectClass} {...register('customer_type')}>
              <option value="regular">Regular</option>
              <option value="corporate">Corporate (B2B)</option>
            </select>
          )}
        </div>
      </div>
    </Section>
  )
}
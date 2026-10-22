'use client'

import { useLayoutEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'

const numberFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
const MAX_DIGITS = 10 // batas bisnis tetap divalidasi Zod

type Props = Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'name'> & {
  value: number | null | undefined
  onValueChange: (value: number | null) => void
  name?: string // jika diisi, nilai mentah ikut terkirim lewat FormData
}

export function RupiahInput({ value, onValueChange, name, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const digitsBeforeCaret = useRef<number | null>(null)
  const text = typeof value === 'number' && Number.isFinite(value) ? numberFmt.format(value) : ''

  // Setelah teks diformat ulang, kembalikan kursor ke digit yang sama (agar mengedit di tengah angka tidak melompat)
  useLayoutEffect(() => {
    const el = ref.current
    const target = digitsBeforeCaret.current
    digitsBeforeCaret.current = null
    if (!el || target === null || document.activeElement !== el) return
    let pos = 0
    let seen = 0
    while (pos < text.length && seen < target) {
      if (text[pos] >= '0' && text[pos] <= '9') seen++
      pos++
    }
    el.setSelectionRange(pos, pos)
  }, [text])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const caret = e.target.selectionStart ?? raw.length
    digitsBeforeCaret.current = raw.slice(0, caret).replace(/\D/g, '').length
    const digits = raw.replace(/\D/g, '').slice(0, MAX_DIGITS)
    onValueChange(digits === '' ? null : Number(digits))
  }

  return (
    <>
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={handleChange}
        {...rest}
      />
      {name && <input type="hidden" name={name} value={typeof value === 'number' ? value : ''} />}
    </>
  )
}
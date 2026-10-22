'use client'

import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { usePlaceSuggestions } from '@/lib/public/use-place-suggestions'

type Props = {
  id: string
  value: string
  onChange: (value: string) => void // pengguna mengetik
  onPick: (value: string) => void // pengguna memilih saran
}

export function PlaceInput({ id, value, onChange, onPick }: Props) {
  const listId = useId()
  const [suppressed, setSuppressed] = useState(false) // setelah memilih, jangan cari saran lagi
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const { items, loading, fallback, noteInput } = usePlaceSuggestions(value, !suppressed)

  const show = open && !suppressed && value.trim().length >= 3 && (items.length > 0 || loading || fallback)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setSuppressed(false)
    setOpen(true)
    setActive(-1)
    if (v.trim().length >= 3) noteInput()
    onChange(v)
  }

  function pick(text: string) {
    setSuppressed(true)
    setOpen(false)
    setActive(-1)
    onPick(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') return setOpen(false)
    if (!show || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(items[active].text)
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Contoh: Jl. Basuki Rahmat 1, Surabaya"
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {show && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-md">
          <ul id={listId} role="listbox">
            {items.map((s, i) => (
              <li
                key={s.place_id}
                role="option"
                aria-selected={i === active}
                // onMouseDown (bukan onClick) agar terjadi sebelum kolom kehilangan fokus
                onMouseDown={(e) => { e.preventDefault(); pick(s.text) }}
                className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-muted' : 'hover:bg-muted/60'}`}
              >
                {s.text}
              </li>
            ))}
          </ul>
          {loading && items.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Mencari alamat...</p>}
          {fallback && items.length === 0 && !loading && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Saran alamat sedang tidak tersedia. Ketik alamat selengkap mungkin.
            </p>
          )}
          {items.length > 0 && <p className="border-t px-3 py-1 text-right text-[10px] text-muted-foreground">powered by Google</p>}
        </div>
      )}
    </div>
  )
}
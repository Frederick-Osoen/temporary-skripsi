'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type CartItem = { id: string; qty: number }

const KEY = 'jj_cart_v1'

type CartCtx = {
  items: CartItem[]
  ready: boolean // false sampai localStorage selesai dibaca (hindari flicker/hydration mismatch)
  count: number
  add: (id: string, qty?: number) => void
  setQty: (id: string, qty: number) => void
  remove: (id: string) => void
  clear: () => void
}

const CartContext = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)

  // Baca sekali setelah mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (i): i is CartItem =>
                typeof i?.id === 'string' && Number.isInteger(i?.qty) && i.qty > 0
            )
          )
        }
      }
    } catch {}
    setReady(true)
  }, [])

  // Simpan setiap berubah (setelah ready, supaya tidak menimpa data lama dengan [])
  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {}
  }, [items, ready])

  const add = useCallback((id: string, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === id)
      return found
        ? prev.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i))
        : [...prev, { id, qty }]
    })
  }, [])

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, qty } : i))
    )
  }, [])

  const remove = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartCtx>(
    () => ({ items, ready, count: items.reduce((s, i) => s + i.qty, 0), add, setQty, remove, clear }),
    [items, ready, add, setQty, remove, clear]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart harus dipakai di dalam <CartProvider>')
  return ctx
}
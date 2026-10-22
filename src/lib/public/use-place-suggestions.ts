'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from '@/lib/use-debounced-value'

export type Suggestion = { place_id: string; text: string }
const DEBOUNCE_MS = 500
const MIN_CHARS = 3

export function usePlaceSuggestions(query: string, enabled: boolean) {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS) // request hanya setelah berhenti mengetik 500 ms
  const inputEvents = useRef(0) // ketikan (>= 3 huruf) sejak request terakhir
  const [items, setItems] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [fallback, setFallback] = useState(false)

  const noteInput = useCallback(() => { inputEvents.current += 1 }, [])

  useEffect(() => {
    if (!enabled || debounced.length < MIN_CHARS) {
      setItems([])
      setLoading(false)
      return
    }

    const controller = new AbortController() // request lama dibatalkan jika query berganti
    const events = inputEvents.current
    inputEvents.current = 0
    setLoading(true)

    void (async () => {
      try {
        const res = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-source': 'public', 'x-input-events': String(events) },
          body: JSON.stringify({ input: debounced }),
          signal: controller.signal,
        })
        const json = (await res.json().catch(() => null)) as { suggestions?: Suggestion[] } | null
        if (controller.signal.aborted) return
        if (!res.ok || !json) {
          setItems([])
          setFallback(true) // UI tetap membolehkan mengetik alamat bebas
        } else {
          setItems(json.suggestions ?? [])
          setFallback(false)
        }
      } catch {
        if (controller.signal.aborted) return
        setItems([])
        setFallback(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [debounced, enabled])

  return { items, loading, fallback, noteInput }
}
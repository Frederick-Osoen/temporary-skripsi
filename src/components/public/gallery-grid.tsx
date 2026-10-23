'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { EVENT_TYPE_LABEL, type EventType, type GalleryItem } from '@/lib/public/content'
import { productImageUrl } from '@/lib/storage'
import { cn } from '@/lib/utils'

// Foto galeri memakai bucket yang sama dengan foto produk (folder gallery/).
const src = (p: string) => productImageUrl(p) ?? ''

export function GalleryGrid({ items, filterable = false }: { items: GalleryItem[]; filterable?: boolean }) {
  const [filter, setFilter] = useState<EventType | 'all'>('all')
  const [open, setOpen] = useState<GalleryItem | null>(null)
  const types = Array.from(new Set(items.map((i) => i.event_type)))
  const shown = items.filter((i) => filter === 'all' || i.event_type === filter)

  return (
    <>
      {filterable && types.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {(['all', ...types] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={filter === t}
              onClick={() => setFilter(t)}
              className={cn(
                'focus-ink h-10 rounded-full border px-4 text-sm',
                filter === t ? 'border-ink bg-ink text-white' : 'border-border text-muted-foreground hover:border-input'
              )}
            >
              {t === 'all' ? 'Semua' : EVENT_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
        {shown.map((g) => (
          <li key={g.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => setOpen(g)}
              className="focus-ink group relative block w-full overflow-hidden rounded-2xl bg-muted text-left"
            >
              <Image
                src={src(g.image_path)}
                alt={g.caption}
                width={800}
                height={600}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 to-transparent p-4 pt-12 text-sm text-white">
                <span className="block font-medium">{g.caption}</span>
                <span className="text-xs text-white/70">
                  {EVENT_TYPE_LABEL[g.event_type]}
                  {g.location ? `, ${g.location}` : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl border-0 bg-ink p-2 text-white sm:p-3" showCloseButton={false}>
          {open && (
            <>
              <DialogTitle className="sr-only">{open.caption}</DialogTitle>
              <Image src={src(open.image_path)} alt={open.caption} width={1600} height={1200} className="h-auto max-h-[78vh] w-full rounded-xl object-contain" />
              <div className="flex items-start justify-between gap-4 px-2 py-3">
                <p className="text-sm">
                  {open.caption}
                  <span className="block text-xs text-white/60">
                    {EVENT_TYPE_LABEL[open.event_type]}
                    {open.location ? `, ${open.location}` : ''}
                  </span>
                </p>
                <button type="button" onClick={() => setOpen(null)} aria-label="Tutup" className="focus-ink rounded-full p-2 hover:bg-white/10">
                  <X className="size-4" />
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

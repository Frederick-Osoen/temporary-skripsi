'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { BUSINESS } from '@/lib/public/business'

/** Peta dimuat hanya setelah diklik: halaman tetap ringan dan tidak memuat skrip Google tanpa izin. */
export function MapEmbed({ compact = false }: { compact?: boolean }) {
  const [load, setLoad] = useState(false)
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-ink ${compact ? 'h-44' : 'aspect-[4/3] sm:aspect-[16/10]'}`}>
      {load ? (
        <iframe
          src={BUSINESS.mapsEmbedUrl}
          title="Peta lokasi toko JJ Teknik di Pandaan"
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoad(true)}
          className="focus-ink group absolute inset-0 flex flex-col items-center justify-center gap-3 text-white"
        >
          {/* Cincin radius, bukan gambar peta sungguhan */}
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            {[1, 2, 3].map((r) => (
              <span key={r} className="absolute rounded-full border border-frost/25" style={{ width: `${r * 28}%`, aspectRatio: '1' }} />
            ))}
          </span>
          <span className="relative flex size-12 items-center justify-center rounded-full bg-volt text-volt-foreground transition-transform group-hover:scale-110">
            <MapPin className="size-5" />
          </span>
          <span className="relative text-sm font-medium">Tampilkan peta</span>
          <span className="relative text-xs text-white/60">Memuat Google Maps</span>
        </button>
      )}
    </div>
  )
}

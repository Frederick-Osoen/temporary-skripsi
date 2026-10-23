import { cn } from '@/lib/utils'

/**
 * PROPOSAL wordmark baru (bukan identitas final). Monogram "JJ" dengan
 * satu titik amber (daya) dan garis cyan (udara dingin).
 * Logo lama ada di public/brand/logo-lama.png dan sengaja tidak dipakai di header.
 */
export function BrandMark({ className, tone = 'night' }: { className?: string; tone?: 'night' | 'day' }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9 shrink-0', className)} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill={tone === 'night' ? 'var(--ink-2)' : 'var(--ink)'} />
      <path
        d="M14.5 11v12.2c0 3-1.7 4.8-4.4 4.8M24.5 11v12.2c0 3-1.7 4.8-4.4 4.8"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M9 32.5c5-2 10 2 15 0s7-1 7-1" fill="none" stroke="var(--frost)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30.5" cy="11.5" r="3" fill="var(--volt)" />
    </svg>
  )
}

export function Wordmark({ tone = 'day' }: { tone?: 'night' | 'day' }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark tone={tone} />
      <span className="leading-none">
        <span className="block font-heading text-[15px] font-semibold tracking-tight">JJ Teknik</span>
        <span className={cn('mt-1 hidden text-[11px] sm:block', tone === 'night' ? 'text-white/60' : 'text-muted-foreground')}>
          Sewa AC, genset &amp; servis
        </span>
      </span>
    </span>
  )
}

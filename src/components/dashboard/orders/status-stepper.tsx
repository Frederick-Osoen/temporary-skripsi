import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Step = { key: string; label: string }

export function StatusStepper({
  steps,
  currentIndex,
  cancelled = false,
}: {
  steps: Step[]
  currentIndex: number
  cancelled?: boolean
}) {
  const current = steps[currentIndex]

  return (
    <div>
      {/* Mobile: satu baris teks ringkas */}
      <p className="mb-2 text-xs text-muted-foreground sm:hidden">
        {cancelled ? (
          <span className="font-medium text-destructive">Dibatalkan</span>
        ) : (
          <>
            Langkah {currentIndex + 1} dari {steps.length} ·{' '}
            <span className="font-medium text-foreground">{current?.label}</span>
          </>
        )}
      </p>

      <ol className="flex gap-1.5">
        {steps.map((s, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          return (
            <li key={s.key} className="min-w-0 flex-1" aria-current={active ? 'step' : undefined}>
              <div
                className={cn(
                  'h-1.5 rounded-full transition-colors',
                  cancelled
                    ? 'bg-destructive/30'
                    : done
                      ? 'bg-primary'
                      : active
                        ? 'bg-primary/60 ring-2 ring-primary/20'
                        : 'bg-muted'
                )}
              />
              {/* Label hanya di layar >= sm */}
              <span
                className={cn(
                  'mt-1.5 hidden items-center gap-1 truncate text-[11px] sm:flex',
                  active && !cancelled ? 'font-semibold text-foreground' : 'text-muted-foreground'
                )}
              >
                {done && !cancelled && <Check className="h-3 w-3 shrink-0" />}
                <span className="truncate">{s.label}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
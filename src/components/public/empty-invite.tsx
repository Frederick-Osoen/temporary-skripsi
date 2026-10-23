import { MessageCircle } from 'lucide-react'
import { waLink } from '@/lib/public/business'

/** Keadaan kosong yang disengaja: bingkai foto bergaris + ajakan chat, bukan "belum ada data". */
export function EmptyInvite({
  waNumber,
  title,
  text,
  message,
  tiles = 6,
}: {
  waNumber: string
  title: string
  text: string
  message: string
  tiles?: number
}) {
  return (
    <div className="relative">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden="true">
        {Array.from({ length: tiles }, (_, i) => (
          <li
            key={i}
            className={`rounded-2xl border-2 border-dashed border-border bg-card/60 ${i % 3 === 1 ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}
          />
        ))}
      </ul>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="panel max-w-md p-6 text-center shadow-float sm:p-8">
          <p className="font-heading text-xl font-semibold tracking-tight">{title}</p>
          <p className="mt-3 leading-relaxed text-muted-foreground">{text}</p>
          <a
            href={waLink(waNumber, message)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ink mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-wa px-5 text-sm font-semibold text-white"
          >
            <MessageCircle className="size-4" aria-hidden="true" /> Minta lewat WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}

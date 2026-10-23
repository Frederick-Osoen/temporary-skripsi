import Image from 'next/image'
import { EVENT_TYPE_LABEL, type Testimonial } from '@/lib/public/content-types'
import { productImageUrl } from '@/lib/storage'

export function TestimonialList({ items }: { items: Testimonial[] }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => {
        const img = t.image_path ? productImageUrl(t.image_path) : null
        return (
          <li key={t.id} className="panel flex flex-col p-6">
            <p className="font-heading text-lg leading-snug font-medium tracking-tight">&ldquo;{t.quote}&rdquo;</p>
            {img && (
              <Image
                src={img}
                alt={`Tangkapan layar chat dari ${t.name}`}
                width={600}
                height={900}
                className="mt-5 h-auto w-full rounded-xl border"
              />
            )}
            <div className="mt-auto pt-6 text-sm">
              <p className="font-semibold">{t.name}</p>
              <p className="text-muted-foreground">
                {[t.role, t.event_type ? EVENT_TYPE_LABEL[t.event_type] : null].filter(Boolean).join(', ')}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

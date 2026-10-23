export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="border-t">
      {items.map((f) => (
        <details key={f.q} className="group border-b">
          <summary className="focus-ink flex cursor-pointer list-none items-center justify-between gap-6 rounded py-5 text-left [&::-webkit-details-marker]:hidden">
            <h3 className="font-heading text-[15px] font-medium tracking-tight sm:text-base">{f.q}</h3>
            <span
              className="relative size-8 shrink-0 rounded-full border transition-[transform,background-color] duration-300 group-open:rotate-45 group-open:bg-ink group-open:text-white"
              aria-hidden="true"
            >
              <span className="absolute top-1/2 left-1/2 h-px w-3 -translate-1/2 bg-current" />
              <span className="absolute top-1/2 left-1/2 h-3 w-px -translate-1/2 bg-current" />
            </span>
          </summary>
          <p className="max-w-2xl pr-12 pb-6 leading-relaxed text-muted-foreground">{f.a}</p>
        </details>
      ))}
    </div>
  )
}

export function PageHero({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="border-b bg-card">
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-12 sm:pt-20 sm:pb-16">
        <h1 className="max-w-3xl font-heading text-4xl leading-[1.02] font-semibold sm:text-6xl">{title}</h1>
        {lead && <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{lead}</p>}
        {children}
      </div>
    </div>
  )
}

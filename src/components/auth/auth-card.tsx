import { Snowflake } from 'lucide-react'

// Dipakai login, lupa password, dan reset password.
// Desktop: panel navy (identitas) di kiri + form di kanan. HP: pita navy di atas + form.
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] bg-background lg:grid-rows-none lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="bg-hero relative flex flex-col justify-between overflow-hidden px-6 py-6 sm:px-10 lg:py-10">
        {/* Gelombang udara dingin: lingkaran konsentris dari pojok, murni dekorasi */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-40 h-[34rem] w-[34rem] rounded-full opacity-60"
          style={{
            background:
              'repeating-radial-gradient(circle at center, transparent 0 38px, rgb(34 211 238 / 0.22) 38px 39px)',
            maskImage: 'radial-gradient(circle at center, #000 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(circle at center, #000 30%, transparent 70%)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Snowflake className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block font-heading text-base font-bold text-white">JJ Teknik</span>
            <span className="block text-xs text-white/70">Sewa AC, genset &amp; sparepart</span>
          </span>
        </div>
        <p className="relative mt-10 hidden max-w-sm font-heading text-3xl font-bold leading-tight text-white lg:block">
          Pesanan, jadwal pemasangan, dan unit dalam satu tempat.
        </p>
        <p className="relative mt-6 hidden text-xs text-white/60 lg:block">Pandaan, Pasuruan</p>
      </div>

      <div className="flex items-start justify-center px-6 py-10 sm:items-center sm:px-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  )
}

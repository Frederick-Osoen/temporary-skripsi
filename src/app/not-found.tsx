import Link from 'next/link'
import { Snowflake, Zap } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="surface-ink bg-noise flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="relative z-10 max-w-lg">
        <span className="relative mx-auto mb-8 inline-flex size-12 items-center justify-center rounded-2xl bg-white/10">
          <Snowflake className="size-6 text-frost" aria-hidden="true" />
          <Zap className="absolute -right-1.5 -bottom-1.5 size-5 rounded-full bg-volt p-1 text-volt-foreground" aria-hidden="true" />
        </span>

        <p className="spec text-7xl font-bold text-frost sm:text-8xl">404</p>

        <h1 className="font-heading mt-6 text-2xl font-bold sm:text-3xl">Halaman ini tidak ada</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70">
          Alamatnya mungkin salah ketik atau sudah dipindahkan. Lanjutkan dari katalog, atau hitung estimasi sewa Anda.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/katalog" className={buttonVariants({ variant: 'accent', className: 'h-12 px-6 text-base' })}>
            Lihat katalog
          </Link>
          <Link
            href="/"
            className="focus-ink inline-flex h-12 items-center rounded-md border border-white/25 px-6 text-base font-medium text-white transition-colors hover:bg-white/10"
          >
            Ke beranda
          </Link>
        </div>
      </div>
    </main>
  )
}

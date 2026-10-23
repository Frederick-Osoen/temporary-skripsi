import Link from 'next/link'
import { geologica, unbounded } from '@/app/(public)/fonts'
import { BrandMark } from '@/components/public/brand-mark'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <main
      className={cn(
        'theme-public band-night grain flex min-h-screen flex-col items-center justify-center px-4 text-center',
        unbounded.variable,
        geologica.variable
      )}
    >
      <BrandMark className="size-12" />
      <p className="num mt-10 text-[7rem] font-semibold text-frost sm:text-[9rem]">404</p>
      <h1 className="mt-4 font-heading text-2xl font-semibold sm:text-3xl">Halaman ini sudah dingin, tapi kosong.</h1>
      <p className="mx-auto mt-4 max-w-md leading-relaxed text-white/70">
        Alamatnya mungkin salah ketik atau sudah dipindahkan. Lanjutkan dari katalog, atau hitung estimasi sewa Anda.
      </p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link
          href="/katalog"
          className="focus-ink inline-flex h-12 items-center rounded-full bg-volt px-6 font-semibold text-volt-foreground"
        >
          Lihat katalog
        </Link>
        <Link
          href="/"
          className="focus-ink inline-flex h-12 items-center rounded-full border border-white/25 px-6 font-medium text-white hover:bg-white/10"
        >
          Ke beranda
        </Link>
      </div>
    </main>
  )
}

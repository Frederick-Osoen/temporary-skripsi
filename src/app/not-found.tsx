import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="bg-hero flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-gradient text-7xl font-extrabold tracking-tight sm:text-8xl">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Halaman tidak ditemukan</h1>
        <p className="mx-auto max-w-md text-sm text-white/75">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan. Silakan kembali ke beranda atau hitung estimasi biaya sewa Anda.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonVariants({ variant: 'accent', size: 'lg' })}>Ke Beranda</Link>
        <Link href="/estimasi" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white' })}>
          Hitung Estimasi
        </Link>
      </div>
    </main>
  )
}

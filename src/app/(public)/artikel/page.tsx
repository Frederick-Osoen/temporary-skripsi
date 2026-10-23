import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/public/page-hero'
import { ARTICLES } from '@/content/articles'
import { formatDate } from '@/lib/orders/utils'

export const metadata: Metadata = {
  title: 'Artikel',
  description: 'Panduan singkat soal AC, genset, dan persiapan acara dari JJ Teknik Pandaan.',
}

export default function ArticlesPage() {
  return (
    <>
      <PageHero title="Panduan singkat." lead="Hal yang sering ditanyakan pelanggan, kami tulis supaya Anda bisa memutuskan lebih cepat." />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <ul className="border-t">
          {ARTICLES.map((a) => (
            <li key={a.slug} className="border-b">
              <Link href={`/artikel/${a.slug}`} className="focus-ink group grid gap-3 py-8 sm:grid-cols-12 sm:gap-8">
                <span className="tnum text-sm text-muted-foreground sm:col-span-3">
                  {formatDate(a.date)}, {a.minutes} menit baca
                </span>
                <span className="sm:col-span-9">
                  <span className="block font-heading text-xl font-semibold tracking-tight transition-colors group-hover:text-primary sm:text-2xl">
                    {a.title}
                  </span>
                  <span className="mt-2 block max-w-2xl leading-relaxed text-muted-foreground">{a.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

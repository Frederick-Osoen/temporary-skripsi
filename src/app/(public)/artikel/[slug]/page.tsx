import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/public/json-ld'
import { ARTICLES, getArticle } from '@/content/articles'
import { formatDate } from '@/lib/orders/utils'
import { SITE_URL } from '@/lib/public/site'

export const dynamicParams = false

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = getArticle(slug)
  if (!a) return {}
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/artikel/${a.slug}` },
    openGraph: { type: 'article', title: a.title, description: a.description, publishedTime: a.date },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = getArticle(slug)
  if (!a) notFound()

  const others = ARTICLES.filter((x) => x.slug !== a.slug)

  return (
    <article>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title,
          description: a.description,
          datePublished: a.date,
          author: { '@type': 'Organization', name: 'JJ Teknik' },
          publisher: { '@type': 'Organization', name: 'JJ Teknik' },
          mainEntityOfPage: `${SITE_URL}/artikel/${a.slug}`,
        }}
      />
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 pt-12 pb-10 sm:pt-16">
          <Link href="/artikel" className="text-sm text-muted-foreground hover:text-foreground">
            Artikel
          </Link>
          <h1 className="mt-4 font-heading text-3xl leading-[1.08] font-semibold sm:text-5xl">{a.title}</h1>
          <p className="tnum mt-5 text-sm text-muted-foreground">
            {formatDate(a.date)}, {a.minutes} menit baca
          </p>
        </div>
      </header>

      <div className="prose-jj mx-auto max-w-3xl px-4 py-12 sm:py-16">{a.body}</div>

      <aside className="border-t bg-muted/60">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="font-heading text-lg font-semibold">Baca juga</h2>
          <ul className="mt-4 space-y-3">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/artikel/${o.slug}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </article>
  )
}

import type { MetadataRoute } from 'next'
import { ARTICLES } from '@/content/articles'
import { SITE_URL } from '@/lib/public/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/katalog', '/estimasi', '/kalkulator', '/galeri', '/testimoni', '/tentang', '/kontak', '/artikel']
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...ARTICLES.map((a) => ({ url: `${SITE_URL}/artikel/${a.slug}`, lastModified: a.date, changeFrequency: 'monthly' as const, priority: 0.5 })),
  ]
}

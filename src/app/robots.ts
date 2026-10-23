import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/public/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/api', '/login', '/auth', '/forgot-password', '/reset-password'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

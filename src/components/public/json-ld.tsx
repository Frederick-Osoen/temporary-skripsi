import { BUSINESS } from '@/lib/public/business'
import { SITE_URL } from '@/lib/public/site'

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON dari objek milik kita sendiri; "<" di-escape supaya aman di dalam <script>
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export function localBusinessLd(waNumber: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: BUSINESS.name,
    description: BUSINESS.legalTagline,
    url: SITE_URL,
    foundingDate: String(BUSINESS.founded),
    founder: { '@type': 'Person', name: BUSINESS.owner },
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.street,
      addressLocality: 'Pandaan',
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    },
    areaServed: BUSINESS.serviceArea,
    hasMap: BUSINESS.mapsUrl,
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', url: `https://wa.me/${waNumber}` },
  }
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
}

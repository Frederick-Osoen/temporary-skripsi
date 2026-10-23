import type { Metadata } from 'next'
import { EmptyInvite } from '@/components/public/empty-invite'
import { PageHero } from '@/components/public/page-hero'
import { TestimonialList } from '@/components/public/testimonial-list'
import { getTestimonials } from '@/lib/public/content'
import { getStoreSettings } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Testimoni',
  description: 'Cerita pelanggan JJ Teknik: event organizer, korporat, dan acara keluarga.',
}
export const revalidate = 60

export default async function TestimonialPage() {
  const [items, settings] = await Promise.all([getTestimonials(), getStoreSettings()])
  return (
    <>
      <PageHero title="Kata mereka." lead="Cerita dari event organizer, perusahaan, dan keluarga yang acaranya kami dinginkan." />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {items.length > 0 ? (
          <TestimonialList items={items} />
        ) : (
          <EmptyInvite
            waNumber={settings.wa_number}
            tiles={3}
            title="Testimoni sedang kami kumpulkan"
            text="Kami hanya memajang testimoni asli, dengan izin pelanggan. Pernah memakai jasa kami? Ceritakan pengalaman Anda lewat WhatsApp."
            message="Halo JJ Teknik, saya ingin memberi testimoni."
          />
        )}
      </div>
    </>
  )
}

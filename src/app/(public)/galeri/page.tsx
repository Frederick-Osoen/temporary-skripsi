import type { Metadata } from 'next'
import { EmptyInvite } from '@/components/public/empty-invite'
import { GalleryGrid } from '@/components/public/gallery-grid'
import { PageHero } from '@/components/public/page-hero'
import { getGallery } from '@/lib/public/content'
import { getStoreSettings } from '@/lib/settings'

export const metadata: Metadata = {
  title: 'Galeri Pemasangan',
  description: 'Foto pemasangan AC standing, misty fan, dan genset JJ Teknik di acara pernikahan, korporat, dan pabrik.',
}
export const revalidate = 60

export default async function GalleryPage() {
  const [items, settings] = await Promise.all([getGallery(), getStoreSettings()])
  return (
    <>
      <PageHero title="Dari lapangan." lead="Pemasangan kami di pernikahan, acara kantor, pabrik, dan acara keluarga." />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {items.length > 0 ? (
          <GalleryGrid items={items} filterable />
        ) : (
          <EmptyInvite
            waNumber={settings.wa_number}
            title="Foto pemasangan sedang kami kurasi"
            text="Ingin melihat contoh pemasangan untuk acara seperti milik Anda? Admin bisa mengirim foto dari lapangan lewat WhatsApp."
            message="Halo JJ Teknik, boleh minta contoh foto pemasangan AC untuk acara?"
          />
        )}
      </div>
    </>
  )
}

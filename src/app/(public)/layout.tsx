import type { Metadata } from 'next'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteHeader } from '@/components/public/site-header'
import { CartProvider } from '@/lib/public/cart'
import { getStoreSettings } from '@/lib/settings'
import { CartBar } from '@/components/public/cart-bar'

export const metadata: Metadata = {
    title: { default: 'JJ Teknik - Sewa AC, Genset & Sparepart AC', template: '%s | JJ Teknik' },
    description: 'JJ Teknik (Pandaan): sewa AC Standing, genset, dan misty fan, serta penjualan sparepart AC untuk acara dan industri di Jawa Timur.',
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    const { wa_number } = await getStoreSettings()
    return (
        <div className="flex min-h-screen flex-col">
            <a
                href="#konten"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
            >
                Lewati ke konten
            </a>
            <CartProvider>
                <SiteHeader waNumber={wa_number} />
                <main id="konten" className="flex-1">{children}</main>
                <SiteFooter />
                <CartBar />
            </CartProvider>
        </div>
    )
}

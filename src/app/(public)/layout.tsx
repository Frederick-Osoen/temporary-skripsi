import type { Metadata } from 'next'
import { BottomDock } from '@/components/public/bottom-dock'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteHeader } from '@/components/public/site-header'
import { CartProvider } from '@/lib/public/cart'
import { getStoreSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'
import { geologica, unbounded } from './fonts'

export const metadata: Metadata = {
    title: { default: 'JJ Teknik - Sewa AC Standing, Genset & Misty Fan di Pandaan', template: '%s | JJ Teknik' },
    description:
        'JJ Teknik (Pandaan, Pasuruan): sewa AC standing, misty fan, dan genset untuk acara dan industri, serta pengadaan, servis, dan sparepart AC. Armada sendiri, gratis ongkir radius 25 km.',
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    const { wa_number } = await getStoreSettings()
    return (
        <div className={cn('theme-public flex min-h-screen flex-col antialiased', unbounded.variable, geologica.variable)}>
            <a
                href="#konten"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-volt focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-volt-foreground"
            >
                Lewati ke konten
            </a>
            <CartProvider>
                <SiteHeader waNumber={wa_number} />
                <main id="konten" className="flex-1">
                    {children}
                </main>
                <SiteFooter />
                <BottomDock waNumber={wa_number} />
            </CartProvider>
        </div>
    )
}

import type { Metadata } from 'next'
import { MotionProvider } from '@/components/public/motion'
import { SiteFooter } from '@/components/public/site-footer'
import { SiteHeader } from '@/components/public/site-header'
import { CartProvider } from '@/lib/public/cart'
import { CartBar } from '@/components/public/cart-bar'

export const metadata: Metadata = {
    title: { default: 'JJ Teknik - Sewa AC, Genset & Sparepart AC', template: '%s | JJ Teknik' },
    description: 'JJ Teknik (Pandaan): sewa AC Standing, genset, dan misty fan, serta penjualan sparepart AC untuk acara dan industri di Jawa Timur.',
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <MotionProvider>
            <div className="flex min-h-screen flex-col">
                <CartProvider>
                    <SiteHeader />
                    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
                    <SiteFooter />
                    <CartBar />
                </CartProvider>
            </div>
        </MotionProvider>
    )
}
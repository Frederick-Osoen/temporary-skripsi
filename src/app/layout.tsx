import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { PwaRegister } from "@/components/pwa-register";

// Font dashboard (self-hosted, lihat src/app/fonts/README.md). preload:false karena situs publik
// memakai font sendiri (Unbounded + Geologica) dan tidak perlu mengunduh dua font ini.
const inter = localFont({ src: './fonts/inter.woff2', variable: '--font-sans', display: 'swap', weight: '100 900', preload: false });
const jakarta = localFont({ src: './fonts/plus-jakarta-sans.woff2', variable: '--font-jakarta', display: 'swap', weight: '200 800', preload: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: { apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'JJ Teknik', statusBarStyle: 'black-translucent' },
  title: { default: 'JJ Teknik - Sewa AC, Genset & Sparepart AC', template: '%s | JJ Teknik' },
  description: 'JJ Teknik (Pandaan): sewa AC Standing, genset, dan misty fan, serta penjualan sparepart AC untuk acara dan industri di Jawa Timur.',
  openGraph: {
    type: 'website',
    siteName: 'JJ Teknik',
    locale: 'id_ID',
    title: 'JJ Teknik - Sewa AC, Genset & Sparepart AC',
    description: 'Hitung estimasi biaya sewa dan ongkir, lalu lanjutkan lewat WhatsApp.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b1b33',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={cn("h-full", "antialiased", inter.variable, jakarta.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">{children}
        <PwaRegister />
      </body>
    </html>
  );
}

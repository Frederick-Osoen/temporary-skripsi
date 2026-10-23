import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// Font isi (body) dan heading. display:swap agar teks tampil dulu (membantu LCP).
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
      className={cn("h-full", "antialiased", inter.variable, jakarta.variable, geistMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

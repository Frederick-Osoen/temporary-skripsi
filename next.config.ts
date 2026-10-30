import type { NextConfig } from "next";

// Izinkan next/image memuat foto produk dari Supabase Storage (host diambil dari env, tidak di-hardcode).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null

const nextConfig: NextConfig = {
  serverExternalPackages: ['undici'],
  async headers() {
    // sw.js tidak boleh di-cache lama agar pembaruan service worker sampai ke pengguna
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }]
  },
  images: {
    // Jaringan IPv6/DNS64 (NAT64) membuat host Supabase terbaca sebagai IP privat saat pengembangan.
    // Aman: hanya host Supabase di remotePatterns yang boleh dimuat. Produksi tetap ketat.
    // `npm run build && npm start` di jaringan seperti itu juga berstatus production, sehingga foto tidak muncul.
    // Untuk uji lokal saja, jalankan dengan ALLOW_LOCAL_IMAGE_IP=1. JANGAN diset di Vercel.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_IMAGE_IP === '1',
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/product-images/**' }]
      : [],
  },
};

export default nextConfig;

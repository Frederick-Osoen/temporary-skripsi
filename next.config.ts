import type { NextConfig } from "next";

// Izinkan next/image memuat foto produk dari Supabase Storage (host diambil dari env, tidak di-hardcode).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null

const nextConfig: NextConfig = {
  serverExternalPackages: ['undici'],
  images: {
    // Jaringan IPv6/DNS64 (NAT64) membuat host Supabase terbaca sebagai IP privat saat pengembangan.
    // Aman: hanya host Supabase di remotePatterns yang boleh dimuat. Produksi tetap ketat.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/product-images/**' }]
      : [],
  },
};

export default nextConfig;

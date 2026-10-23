import type { MetadataRoute } from 'next'

// Aplikasi terpasang dibuka langsung di dashboard admin; pengunjung publik tetap memakai situs biasa.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'JJ Teknik',
    short_name: 'JJ Teknik',
    description: 'Dashboard pesanan, jadwal, dan stok JJ Teknik.',
    lang: 'id',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#070F1F',
    theme_color: '#070F1F',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

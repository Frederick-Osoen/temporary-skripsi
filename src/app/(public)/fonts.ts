import localFont from 'next/font/local'

// Font situs publik, self-hosted (lisensi OFL, lihat src/app/fonts/README.md).
// Unbounded: display/heading. Geologica: teks isi.
export const unbounded = localFont({
  src: '../fonts/unbounded.woff2',
  variable: '--font-unbounded',
  weight: '200 900',
  display: 'swap',
})

export const geologica = localFont({
  src: '../fonts/geologica.woff2',
  variable: '--font-geologica',
  weight: '100 900',
  display: 'swap',
})

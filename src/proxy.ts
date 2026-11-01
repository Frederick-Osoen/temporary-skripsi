import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Subdomain khusus admin. Harus sama dengan `has.value` di matcher di bawah (matcher tidak bisa membaca env).
const ADMIN_HOST = 'admin.jjteknik.id'
const PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
  ? process.env.NEXT_PUBLIC_SITE_URL
  : 'https://jjteknik.id'

// Jalur yang memang milik area admin / autentikasi; selain ini dianggap halaman publik.
const ADMIN_AREA = ['/dashboard', '/login', '/forgot-password', '/reset-password', '/auth', '/api', '/icons', '/brand', '/manifest.webmanifest', '/sw.js', '/offline.html', '/favicon.ico', '/icon.svg']
const inAdminArea = (p: string) => ADMIN_AREA.some((a) => p === a || p.startsWith(a + '/'))

export async function proxy(request: NextRequest) {
  const host = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0].split(':')[0].toLowerCase()
  if (host === ADMIN_HOST) {
    const { pathname, search } = request.nextUrl
    // admin.jjteknik.id/ langsung ke dashboard (belum login: dialihkan ke /login oleh updateSession)
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    // Halaman publik tidak dilayani di subdomain admin: kembalikan ke situs utama
    if (!inAdminArea(pathname)) return NextResponse.redirect(new URL(pathname + search, PUBLIC_ORIGIN))
  }
  return updateSession(request)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    // Hanya untuk permintaan lewat subdomain admin: situs publik tidak terkena proxy (tetap statis/cepat)
    { source: '/((?!_next/static|_next/image).*)', has: [{ type: 'host', value: 'admin.jjteknik.id' }] },
  ],
}

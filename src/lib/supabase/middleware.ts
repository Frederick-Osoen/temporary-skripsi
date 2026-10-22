import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { REMEMBER_COOKIE, applyCookiePolicy } from './cookies'
import { isTransientAuthError } from './auth-utils'
import { resilientFetch } from './fetch'

export async function updateSession(request: NextRequest) {
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== '0'
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers?: Record<string, string>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, applyCookiePolicy(value, options, remember))
          )
          // Versi @supabase/ssr baru mengirim header anti-cache untuk respons yang membawa token
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v))
        },
      },
      global: { fetch: resilientFetch }
    }
  )

  // Jangan taruh kode lain antara createServerClient dan getUser()
  const { data, error } = await supabase.auth.getClaims()
  const user = data?.claims ?? null

  const { pathname, search } = request.nextUrl
  const isServerAction = request.headers.has('next-action')

  // Diagnosis: jika sesi hilang karena error selain "memang belum login", catat penyebabnya
  if (!user && error && error.name !== 'AuthSessionMissingError') {
    console.warn(`[auth] getUser gagal di ${pathname}: ${error.name} - ${error.message}`)
  }

  const redirectWithCookies = (to: URL) => {
    const redirect = NextResponse.redirect(to)
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c)) // bawa cookie hasil refresh/hapus
    return redirect
  }

  if (!user && pathname.startsWith('/dashboard')) {
    // 1) Gangguan jaringan sementara: jangan tendang user
    // 2) Server Action: JANGAN redirect (klien tak bisa memproses). Action memeriksa sesi sendiri
    //    lewat requireAdmin() dan mengembalikan { ok:false, code:'UNAUTHENTICATED' }.
    if (isTransientAuthError(error) || isServerAction) return response

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('expired', '1')
    url.searchParams.set('next', pathname + search)
    return redirectWithCookies(url)
  }

  // Sudah login tidak perlu melihat halaman login (kecuali request Server Action)
  if (user && pathname === '/login' && !isServerAction) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return redirectWithCookies(url)
  }

  return response
}
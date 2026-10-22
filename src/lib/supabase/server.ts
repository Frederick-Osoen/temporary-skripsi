import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { resilientFetch } from './fetch'
import { REMEMBER_COOKIE, applyCookiePolicy } from './cookies'

// opts.remember hanya dipakai saat login (cookie preferensi baru ditulis di request yang sama)
export async function createClient(opts?: { remember?: boolean }) {
  const cookieStore = await cookies()
  const remember = opts?.remember ?? cookieStore.get(REMEMBER_COOKIE)?.value !== '0'

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, applyCookiePolicy(value, options, remember))
            )
          } catch {
            // Dipanggil dari Server Component (cookie read-only): aman diabaikan,
            // middleware yang me-refresh sesi.
          }
        },
      },
      global: { fetch: resilientFetch },
    }
  )
}
import type { CookieOptions } from '@supabase/ssr'

export const REMEMBER_COOKIE = 'jj_remember'
export const REMEMBER_DAYS = 30
const REMEMBER_MAX_AGE = REMEMBER_DAYS * 24 * 60 * 60

// remember = true  -> cookie sesi hidup 30 hari (bergeser tiap refresh)
// remember = false -> cookie sesi (hilang saat browser ditutup)
export function applyCookiePolicy(
  value: string,
  options: CookieOptions | undefined,
  remember: boolean
): CookieOptions {
  const opts: CookieOptions = { ...(options ?? {}) }
  if (value === '' || opts.maxAge === 0) return opts // penghapusan cookie: jangan diubah

  delete opts.expires
  if (remember) opts.maxAge = REMEMBER_MAX_AGE
  else delete opts.maxAge
  return opts
}
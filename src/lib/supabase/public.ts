import { createClient } from '@supabase/supabase-js'
import { resilientFetch } from './fetch'

// Untuk halaman publik: hanya membaca data yang dibuka RLS untuk anon. Tanpa sesi/cookie.
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: resilientFetch },
  })
}
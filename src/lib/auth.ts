import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isTransientAuthError } from '@/lib/supabase/auth-utils'

export type AdminContext =
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'UNAVAILABLE'; error: string }

// Wajib dipanggil di awal setiap Server Action dashboard
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) {
    if (isTransientAuthError(error)) {
      return { ok: false, code: 'UNAVAILABLE', error: 'Koneksi ke server autentikasi bermasalah. Coba lagi.' }
    }
    return { ok: false, code: 'UNAUTHENTICATED', error: 'Sesi Anda telah berakhir. Silakan masuk kembali.' }
  }

  const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).maybeSingle()
  if (!admin) return { ok: false, code: 'FORBIDDEN', error: 'Akses ditolak' }

  return { ok: true, supabase }
}

// Kompatibilitas dengan kode lama (products/actions.ts)
export async function getAdminContext() {
  const ctx = await requireAdmin()
  return ctx.ok ? ctx.supabase : null
}
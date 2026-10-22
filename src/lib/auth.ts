import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isTransientAuthError } from '@/lib/supabase/auth-utils'
import { retryTransient } from '@/lib/db-errors'

export type AdminRole = 'owner' | 'admin'
export type AdminFailCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'UNAVAILABLE'
export type AdminFail = { ok: false; code: AdminFailCode; error: string }

type Base = { supabase: SupabaseClient; userId: string }
export type AdminContext = ({ ok: true } & Base) | AdminFail
export type AdminProfileContext = ({ ok: true; role: AdminRole; name: string } & Base) | AdminFail

const MESSAGE: Record<AdminFailCode, string> = {
  UNAUTHENTICATED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  FORBIDDEN: 'Akses ditolak',
  UNAVAILABLE: 'Koneksi ke server bermasalah. Coba lagi.',
}
const fail = (code: AdminFailCode, error = MESSAGE[code]): AdminFail => ({ ok: false, code, error })

// Identitas dari JWT (diverifikasi lokal bila proyek memakai kunci asimetris)
async function readIdentity(): Promise<({ ok: true } & Base) | AdminFail> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (userId) return { ok: true, supabase, userId }
  return isTransientAuthError(error) ? fail('UNAVAILABLE') : fail('UNAUTHENTICATED')
}

// Untuk Server Action biasa. Hak admin dijaga RLS (is_admin) dan fungsi SQL.
export async function requireAdmin(): Promise<AdminContext> {
  return readIdentity()
}

// Untuk yang butuh role/nama (layout, edit override owner)
export async function requireAdminProfile(): Promise<AdminProfileContext> {
  const id = await readIdentity()
  if (!id.ok) return id

  const { data: admin, error } = await retryTransient(() =>
    id.supabase.from('admins').select('name, role').eq('id', id.userId).maybeSingle()
  )
  if (error) {
    // Gagal membaca BUKAN berarti "bukan admin"
    console.error('[auth] gagal membaca admins:', error)
    return fail('UNAVAILABLE', 'Koneksi ke database bermasalah. Coba lagi.')
  }
  if (!admin) return fail('FORBIDDEN')

  return { ok: true, supabase: id.supabase, userId: id.userId, role: admin.role as AdminRole, name: admin.name as string }
}

export async function requireOwner(): Promise<AdminProfileContext> {
  const ctx = await requireAdminProfile()
  if (!ctx.ok) return ctx
  if (ctx.role !== 'owner') return fail('FORBIDDEN', 'Hanya owner yang dapat melakukan tindakan ini.')
  return ctx
}

// Untuk halaman server: satu kali per render walau dipanggil layout DAN halaman
export const getCurrentAdmin = cache(requireAdminProfile)

// Kompatibilitas dengan kode lama
export async function getAdminContext() {
  const ctx = await requireAdmin()
  return ctx.ok ? ctx.supabase : null
}
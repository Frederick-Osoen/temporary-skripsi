'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'
import { REMEMBER_COOKIE } from '@/lib/supabase/cookies'
import { isTransientAuthError } from '@/lib/supabase/auth-utils'

type AuthResult = { ok: true; redirectTo?: string; message?: string } | { ok: false; error: string }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

async function limited(bucket: string, max: number, windowSec: number) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  return checkRateLimit(createAdminClient(), bucket, ip, max, windowSec) // fail-open
}

// Hanya izinkan tujuan di dalam /dashboard (cegah open redirect)
function safeNext(next?: string) {
  return next && next.startsWith('/dashboard') && !next.startsWith('//') && !next.includes('\\')
    ? next
    : '/dashboard'
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
  remember: z.boolean(),
  next: z.string().max(500).optional(),
})

export async function signIn(input: unknown): Promise<AuthResult> {
  try {
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Periksa kembali email dan password.' }
    const { email, password, remember, next } = parsed.data

    const wait = await limited('login', 10, 600)
    if (wait > 0) {
      return { ok: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(wait / 60)} menit.` }
    }

    // Preferensi disimpan dulu; client Supabase di bawah memakai nilai yang sama
    const cookieStore = await cookies()
    cookieStore.set(REMEMBER_COOKIE, remember ? '1' : '0', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 400 * 24 * 60 * 60,
    })

    const supabase = await createClient({ remember })
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (isTransientAuthError(error)) {
        return { ok: false, error: 'Tidak dapat terhubung ke server autentikasi. Coba lagi.' }
      }
      // Pesan generik agar tidak membocorkan apakah email terdaftar
      return { ok: false, error: 'Email atau password salah.' }
    }

    return { ok: true, redirectTo: safeNext(next) }
  } catch (err) {
    console.error('[auth] signIn:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

export async function signOut() {
  const supabase = await createClient()
  // scope 'local': hanya mengakhiri sesi di perangkat ini (bawaan 'global' mematikan SEMUA sesi akun)
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/login')
}

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) })

export async function requestPasswordReset(input: unknown): Promise<AuthResult> {
  const GENERIC = 'Jika email terdaftar, tautan reset password telah dikirim. Periksa kotak masuk dan folder spam.'
  try {
    const parsed = emailSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: 'Format email tidak valid.' }

    const wait = await limited('forgot-password', 5, 3600)
    if (wait > 0) return { ok: false, error: 'Terlalu banyak permintaan. Coba lagi nanti.' }

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
    })

    if (error) {
      console.error('[auth] resetPasswordForEmail:', error.status, error.message)
      if (error.status === 429) {
        return { ok: false, error: 'Batas pengiriman email tercapai. Tunggu beberapa menit lalu coba lagi.' }
      }
    }
    return { ok: true, message: GENERIC } // sama untuk email terdaftar maupun tidak
  } catch (err) {
    console.error('[auth] requestPasswordReset:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password minimal 8 karakter').max(72, 'Password maksimal 72 karakter'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Konfirmasi password tidak sama', path: ['confirm'] })

export async function updatePassword(input: unknown): Promise<AuthResult> {
  try {
    const parsed = passwordSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Tautan sudah kedaluwarsa. Minta tautan reset yang baru.' }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    if (error) {
      if (error.code === 'same_password') return { ok: false, error: 'Password baru tidak boleh sama dengan yang lama.' }
      if (error.code === 'weak_password') return { ok: false, error: 'Password terlalu lemah. Gunakan kombinasi yang lebih kuat.' }
      console.error('[auth] updateUser:', error)
      return { ok: false, error: 'Gagal mengubah password. Coba lagi.' }
    }

    // Setelah reset, akhiri semua sesi (jaga-jaga jika reset dilakukan karena akun diretas)
    await supabase.auth.signOut({ scope: 'global' })
    return { ok: true, redirectTo: '/login?reset=1' }
  } catch (err) {
    console.error('[auth] updatePassword:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}
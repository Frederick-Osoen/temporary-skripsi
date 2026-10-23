'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOwner } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult as Result } from '@/lib/action-client'

const uuid = z.string().uuid()
const BAN_FOREVER = '876000h' // ±100 tahun

const createSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(60, 'Nama maksimal 60 karakter'),
  email: z.string().trim().toLowerCase().email('Email tidak valid').max(120),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(72, 'Kata sandi maksimal 72 karakter'),
})

async function run(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn()
  } catch (err) {
    console.error('[admins] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

// Target harus admin biasa: owner tidak boleh diubah lewat halaman ini (dan tidak boleh diri sendiri).
async function loadTarget(ownerId: string, targetId: string) {
  if (!uuid.safeParse(targetId).success) return { error: 'ID tidak valid' as const }
  if (targetId === ownerId) return { error: 'Akun Anda sendiri tidak bisa diubah dari sini.' as const }
  const db = createAdminClient()
  const { data, error } = await db.from('admins').select('id, role').eq('id', targetId).maybeSingle()
  if (error) return { error: 'Gagal membaca data admin.' as const }
  if (!data) return { error: 'Admin tidak ditemukan.' as const }
  if (data.role === 'owner') return { error: 'Akun owner tidak bisa diubah.' as const }
  return { db }
}

export async function createAdmin(input: unknown): Promise<Result> {
  return run(async () => {
    const parsed = createSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }

    const db = createAdminClient()
    const { data: created, error } = await db.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    })
    if (error || !created.user) {
      const dup = error?.message?.toLowerCase().includes('already')
      if (!dup) console.error('[admins] createUser:', error)
      // Halaman ini khusus owner, jadi alasan dari Supabase aman ditampilkan untuk memudahkan diagnosis
      return { ok: false, error: dup ? 'Email sudah terdaftar.' : `Gagal membuat akun: ${error?.message ?? 'tidak ada respons'}` }
    }

    const { error: insErr } = await db.from('admins').insert({ id: created.user.id, name: parsed.data.name, email: parsed.data.email, role: 'admin' })
    if (insErr) {
      console.error('[admins] insert admins:', insErr)
      await db.auth.admin.deleteUser(created.user.id) // jangan tinggalkan akun tanpa profil
      return { ok: false, error: `Gagal menyimpan profil admin: ${insErr.message}` }
    }
    revalidatePath('/dashboard/admins')
    return { ok: true }
  })
}

export async function setAdminActive(targetId: string, active: boolean): Promise<Result> {
  return run(async () => {
    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const t = await loadTarget(ctx.userId, targetId)
    if ('error' in t) return { ok: false, error: t.error as string }
    const { error } = await t.db.auth.admin.updateUserById(targetId, { ban_duration: active ? 'none' : BAN_FOREVER })
    if (error) {
      console.error('[admins] ban:', error)
      return { ok: false, error: `Gagal mengubah status akun: ${error.message}` }
    }
    revalidatePath('/dashboard/admins')
    return { ok: true }
  })
}

export async function resetAdminPassword(targetId: string, password: unknown): Promise<Result> {
  return run(async () => {
    const pw = createSchema.shape.password.safeParse(password)
    if (!pw.success) return { ok: false, error: pw.error.issues[0].message }
    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const t = await loadTarget(ctx.userId, targetId)
    if ('error' in t) return { ok: false, error: t.error as string }
    const { error } = await t.db.auth.admin.updateUserById(targetId, { password: pw.data })
    if (error) {
      console.error('[admins] reset:', error)
      return { ok: false, error: 'Gagal mengganti kata sandi.' }
    }
    return { ok: true }
  })
}

export async function deleteAdmin(targetId: string): Promise<Result> {
  return run(async () => {
    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const t = await loadTarget(ctx.userId, targetId)
    if ('error' in t) return { ok: false, error: t.error as string }
    const { error } = await t.db.from('admins').delete().eq('id', targetId)
    if (error) {
      if (error.code === '23503') return { ok: false, error: 'Admin ini punya riwayat pesanan/pembayaran, jadi tidak bisa dihapus. Nonaktifkan saja.' }
      console.error('[admins] delete:', error)
      return { ok: false, error: 'Gagal menghapus admin.' }
    }
    await t.db.auth.admin.deleteUser(targetId)
    revalidatePath('/dashboard/admins')
    return { ok: true }
  })
}

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
// import { createClient } from '@/lib/supabase/server'
import { productSchema } from '@/lib/validations/product'
import { requireAdmin } from '@/lib/auth'
import type { ActionResult as Result } from '@/lib/action-client'



async function guard(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn()
  } catch (err) {
    console.error('[products] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

export async function createProduct(input: unknown): Promise<Result> {
  return guard(async () => {
    const parsed = productSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase

    const { error } = await supabase.from('products').insert(parsed.data)
    if (error) {
      console.error('[products] insert:', error)
      return { ok: false, error: 'Gagal menyimpan produk' }
    }
    revalidatePath('/dashboard/products')
    return { ok: true }
  })

}

export async function updateProduct(id: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'ID tidak valid' }
    const parsed = productSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase

    const { data, error } = await supabase.from('products').update(parsed.data).eq('id', id).select('id')
    if (error) {
      console.error('[products] update:', error)
      return { ok: false, error: 'Gagal memperbarui produk' }
    }
    if (!data?.length) return { ok: false, error: 'Produk tidak ditemukan' }

    revalidatePath('/dashboard/products')
    return { ok: true }
  })
}

export async function deleteProduct(id: string): Promise<Result> {
  return guard(async () => {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'ID tidak valid' }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase

    const { data, error } = await supabase.from('products').delete().eq('id', id).select('id')
    if (error) {
      // 23503 = foreign key violation (ON DELETE RESTRICT)
      if (error.code === '23503') {
        return { ok: false, error: 'Produk sudah dipakai di pesanan atau aset fisik, tidak bisa dihapus.' }
      }
      console.error('[products] delete:', error)
      return { ok: false, error: 'Gagal menghapus produk' }
    }
    if (!data?.length) return { ok: false, error: 'Produk tidak ditemukan' }

    revalidatePath('/dashboard/products')
    return { ok: true }
  })

}
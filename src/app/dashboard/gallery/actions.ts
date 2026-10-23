'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import type { ActionResult as Result } from '@/lib/action-client'
import { gallerySchema } from '@/lib/validations/content'

const id = z.string().uuid()

function refresh() {
  revalidatePath('/dashboard/gallery')
  revalidatePath('/galeri')
  revalidatePath('/')
}

async function run(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn()
  } catch (err) {
    console.error('[gallery] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

export async function saveGalleryItem(itemId: string | null, input: unknown): Promise<Result> {
  return run(async () => {
    if (itemId !== null && !id.safeParse(itemId).success) return { ok: false, error: 'ID tidak valid' }
    const parsed = gallerySchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }

    const q = itemId
      ? ctx.supabase.from('gallery_items').update(parsed.data).eq('id', itemId).select('id')
      : ctx.supabase.from('gallery_items').insert(parsed.data).select('id')
    const { data, error } = await q
    if (error) {
      console.error('[gallery] save:', error)
      return { ok: false, error: 'Gagal menyimpan foto galeri.' }
    }
    if (!data?.length) return { ok: false, error: 'Foto tidak ditemukan.' }
    refresh()
    return { ok: true }
  })
}

export async function setGalleryPublished(itemId: string, published: boolean): Promise<Result> {
  return run(async () => {
    if (!id.safeParse(itemId).success) return { ok: false, error: 'ID tidak valid' }
    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const { error } = await ctx.supabase.from('gallery_items').update({ is_published: published }).eq('id', itemId)
    if (error) return { ok: false, error: 'Gagal mengubah status tayang.' }
    refresh()
    return { ok: true }
  })
}

export async function deleteGalleryItem(itemId: string): Promise<Result> {
  return run(async () => {
    if (!id.safeParse(itemId).success) return { ok: false, error: 'ID tidak valid' }
    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const { error } = await ctx.supabase.from('gallery_items').delete().eq('id', itemId)
    if (error) {
      console.error('[gallery] delete:', error)
      return { ok: false, error: 'Gagal menghapus foto.' }
    }
    refresh()
    return { ok: true }
  })
}

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import type { ActionResult as Result } from '@/lib/action-client'
import { testimonialSchema } from '@/lib/validations/content'

const id = z.string().uuid()

function refresh() {
  revalidatePath('/dashboard/testimonials')
  revalidatePath('/testimoni')
  revalidatePath('/')
}

async function run(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn()
  } catch (err) {
    console.error('[testimonials] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

export async function saveTestimonial(itemId: string | null, input: unknown): Promise<Result> {
  return run(async () => {
    if (itemId !== null && !id.safeParse(itemId).success) return { ok: false, error: 'ID tidak valid' }
    const parsed = testimonialSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }

    const q = itemId
      ? ctx.supabase.from('testimonials').update(parsed.data).eq('id', itemId).select('id')
      : ctx.supabase.from('testimonials').insert(parsed.data).select('id')
    const { data, error } = await q
    if (error) {
      console.error('[testimonials] save:', error)
      return { ok: false, error: 'Gagal menyimpan testimoni.' }
    }
    if (!data?.length) return { ok: false, error: 'Testimoni tidak ditemukan.' }
    refresh()
    return { ok: true }
  })
}

export async function setTestimonialPublished(itemId: string, published: boolean): Promise<Result> {
  return run(async () => {
    if (!id.safeParse(itemId).success) return { ok: false, error: 'ID tidak valid' }
    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const { error } = await ctx.supabase.from('testimonials').update({ is_published: published }).eq('id', itemId)
    if (error) {
      if (error.code === '23514') return { ok: false, error: 'Centang izin pelanggan (Edit) sebelum menayangkan.' }
      return { ok: false, error: 'Gagal mengubah status tayang.' }
    }
    refresh()
    return { ok: true }
  })
}

export async function deleteTestimonial(itemId: string): Promise<Result> {
  return run(async () => {
    if (!id.safeParse(itemId).success) return { ok: false, error: 'ID tidak valid' }
    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const { error } = await ctx.supabase.from('testimonials').delete().eq('id', itemId)
    if (error) {
      console.error('[testimonials] delete:', error)
      return { ok: false, error: 'Gagal menghapus testimoni.' }
    }
    refresh()
    return { ok: true }
  })
}

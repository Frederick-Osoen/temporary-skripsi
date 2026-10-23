'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import type { ActionResult as Result } from '@/lib/action-client'

const schema = z.object({
  id: z.string().uuid('ID tidak valid'),
  status: z.enum(['new', 'contacted', 'converted', 'dismissed'], { error: 'Status tidak valid' }),
})

export async function updateLeadStatus(id: string, status: string): Promise<Result> {
  try {
    const parsed = schema.safeParse({ id, status })
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }

    // RLS: hanya admin yang boleh UPDATE leads
    const { data, error } = await ctx.supabase
      .from('leads')
      .update({ status: parsed.data.status })
      .eq('id', parsed.data.id)
      .select('id')

    if (error) {
      console.error('[leads] update:', error)
      return { ok: false, error: 'Gagal memperbarui status lead.' }
    }
    if (!data?.length) return { ok: false, error: 'Lead tidak ditemukan.' }

    revalidatePath('/dashboard/leads')
    return { ok: true }
  } catch (err) {
    console.error('[leads] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

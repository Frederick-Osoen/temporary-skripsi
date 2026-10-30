'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOwner } from '@/lib/auth'
import { validateGensetRules } from '@/lib/public/genset'
import type { ActionResult as Result } from '@/lib/action-client'

const ruleSchema = z.object({
  min_ac: z.number({ error: 'Jumlah AC harus angka' }).int('Jumlah AC harus bilangan bulat'),
  max_ac: z.number({ error: 'Batas atas harus angka' }).int('Batas atas harus bilangan bulat').nullable(),
  kva: z.number({ error: 'kVA harus angka' }).int('kVA harus bilangan bulat'),
})
const schema = z.array(ruleSchema).max(20, 'Maksimal 20 aturan')

export async function saveGensetRules(input: unknown): Promise<Result> {
  try {
    const parsed = schema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const problem = validateGensetRules(parsed.data)
    if (problem) return { ok: false, error: problem }

    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }

    const { error } = await ctx.supabase.rpc('save_genset_rules', { p_rules: parsed.data })
    if (error) {
      if (error.code === '42883' || error.code === 'PGRST202') {
        return { ok: false, error: 'Fungsi penyimpanan belum ada: jalankan fase-10a.sql di Supabase dulu.' }
      }
      if (error.code === '42501') return { ok: false, error: 'Hanya owner yang dapat mengubah aturan genset.', code: 'FORBIDDEN' }
      if (error.code === '22023') return { ok: false, error: error.message }
      console.error('[genset] simpan:', error)
      return { ok: false, error: 'Gagal menyimpan aturan genset.' }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/kalkulator')
    revalidatePath('/estimasi')
    revalidatePath('/dashboard/settings')
    return { ok: true }
  } catch (err) {
    console.error('[genset] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

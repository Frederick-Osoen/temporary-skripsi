'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOwner } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone'
import type { ActionResult as Result } from '@/lib/action-client'

const rate = z.coerce.number({ error: 'Harus angka' }).int('Harus bilangan bulat').min(0, 'Tidak boleh negatif').max(100000, 'Terlalu besar')

const schema = z.object({
  wa_number: z.string().trim().transform((v, ctx) => {
    const n = normalizePhone(v)
    if (!n) ctx.addIssue({ code: 'custom', message: 'Nomor WhatsApp tidak valid' })
    return n ?? ''
  }),
  fuel_rate_pickup: rate,
  fuel_rate_truck: rate,
})

export async function saveSettings(input: unknown): Promise<Result> {
  try {
    const parsed = schema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }

    const { data, error } = await ctx.supabase
      .from('store_settings')
      .update({ ...parsed.data, updated_at: new Date().toISOString(), updated_by: ctx.userId })
      .eq('id', 1)
      .select('id')
    if (error) {
      console.error('[settings] update:', error)
      return { ok: false, error: 'Gagal menyimpan pengaturan.' }
    }
    if (!data?.length) return { ok: false, error: 'Pengaturan tidak ditemukan atau Anda bukan owner.' }

    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    console.error('[settings] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

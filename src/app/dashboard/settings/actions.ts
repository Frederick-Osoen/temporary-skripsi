'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireOwner } from '@/lib/auth'
import { normalizePhone } from '@/lib/phone'
import { parseEmails } from '@/lib/notify/recipients'
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

// Kolom dari fase-9d.sql
const extended = z.object({
  store_phone: z.string().trim().max(25, 'Telepon terlalu panjang').refine((v) => v === '' || /^[0-9+()\-\s]{6,25}$/.test(v), 'Telepon hanya boleh berisi angka, spasi, +, - dan tanda kurung'),
  opening_hours: z.string().transform((v) => v.split('\n').map((l) => l.trim()).filter(Boolean)).pipe(
    z.array(z.string().max(60, 'Tiap baris jam buka maksimal 60 karakter')).max(7, 'Jam buka maksimal 7 baris')
  ).transform((l) => l.join('\n')),
  notify_emails: z.string().transform((v, ctx) => {
    const raw = v.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)
    const ok = parseEmails(v)
    if (raw.length > ok.length) ctx.addIssue({ code: 'custom', message: `Ada alamat email yang tidak valid: ${raw.filter((r) => !ok.includes(r.toLowerCase())).join(', ')}` })
    if (ok.length > 10) ctx.addIssue({ code: 'custom', message: 'Maksimal 10 alamat email' })
    return ok.join(', ')
  }),
})

// Kolom dari fase-9e.sql
const social = (host: RegExp, name: string) =>
  z.string().trim().max(200, 'Tautan terlalu panjang').refine(
    (v) => v === '' || (/^https:\/\//i.test(v) && host.test(v)),
    `Tautan ${name} harus diawali https:// dan mengarah ke ${name}`
  )
const extended2 = z.object({
  contact_email: z.string().trim().max(120).refine((v) => v === '' || parseEmails(v).length === 1, 'Email kontak tidak valid').transform((v) => v.toLowerCase()),
  instagram_url: social(/^https:\/\/(www\.)?instagram\.com\//i, 'Instagram'),
  tiktok_url: social(/^https:\/\/(www\.|vt\.|vm\.)?tiktok\.com\//i, 'TikTok'),
})

export async function saveSettings(input: unknown): Promise<Result> {
  try {
    const parsed = schema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
    const ext = extended.safeParse(input)
    if (!ext.success) return { ok: false, error: ext.error.issues[0].message }

    const ext2 = extended2.safeParse(input)
    if (!ext2.success) return { ok: false, error: ext2.error.issues[0].message }

    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }

    const base = { updated_at: new Date().toISOString(), updated_by: ctx.userId }
    let res = await ctx.supabase.from('store_settings').update({ ...parsed.data, ...ext.data, ...ext2.data, ...base }).eq('id', 1).select('id')

    // Kolom baru belum ada (fase-9d.sql belum dijalankan): simpan bagian lama saja dan beri tahu
    if (res.error?.code === '42703' || res.error?.code === 'PGRST204') {
      res = await ctx.supabase.from('store_settings').update({ ...parsed.data, ...base }).eq('id', 1).select('id')
      if (!res.error && res.data?.length) {
        revalidatePath('/', 'layout')
        return { ok: false, error: 'WhatsApp dan tarif BBM tersimpan, tetapi telepon, jam buka, penerima email, kontak, dan sosmed belum: jalankan fase-9d.sql dan fase-9e.sql di Supabase dulu.' }
      }
    }
    if (res.error) {
      console.error('[settings] update:', res.error)
      return { ok: false, error: 'Gagal menyimpan pengaturan.' }
    }
    if (!res.data?.length) return { ok: false, error: 'Pengaturan tidak ditemukan atau Anda bukan owner.' }

    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (err) {
    console.error('[settings] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

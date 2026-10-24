import { createAdminClient } from '@/lib/supabase/admin'

// Penerima email.
//   OWNER_EMAIL    : (.env) penerima audit (batal / buka kunci / ubah pembayaran)
//   Penerima operasional (lead baru, ringkasan harian, kegagalan):
//     - bila owner mengisinya di Dashboard > Pengaturan, itu yang dipakai
//     - bila kosong, dipakai NOTIFY_EMAILS dari .env (dipisah koma)
//     Owner selalu ikut menerima email operasional.
export const parseEmails = (v: string | undefined | null) =>
  Array.from(new Set((v ?? '').split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter((s) => /^\S+@\S+\.\S+$/.test(s))))

export const ownerRecipients = () => parseEmails(process.env.OWNER_EMAIL)

async function dashboardEmails(): Promise<string[]> {
  try {
    const { data, error } = await createAdminClient().from('store_settings').select('notify_emails').eq('id', 1).maybeSingle()
    if (error || !data) return [] // kolom belum ada (fase-9d.sql belum dijalankan) atau gagal baca: pakai .env
    return parseEmails(String((data as { notify_emails?: string }).notify_emails ?? ''))
  } catch {
    return []
  }
}

export async function opsRecipients(): Promise<string[]> {
  const fromDashboard = await dashboardEmails()
  const base = fromDashboard.length > 0 ? fromDashboard : parseEmails(process.env.NOTIFY_EMAILS)
  return Array.from(new Set([...base, ...ownerRecipients()]))
}

export async function opsSource(): Promise<'dashboard' | 'env' | 'none'> {
  if ((await dashboardEmails()).length > 0) return 'dashboard'
  return parseEmails(process.env.NOTIFY_EMAILS).length > 0 ? 'env' : 'none'
}

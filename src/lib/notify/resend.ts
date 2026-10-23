// Pengirim email lewat REST API Resend (tanpa SDK). Tidak pernah melempar error:
// email adalah pelengkap, kegagalannya tidak boleh menggagalkan pekerjaan utama.
const FROM = process.env.RESEND_FROM || 'JJ Teknik <onboarding@resend.dev>'

export type MailResult = { ok: true } | { ok: false; reason: string }

export async function sendEmail(opts: { to: string[]; subject: string; html: string; text: string }): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, reason: 'RESEND_API_KEY belum diset' }
  if (opts.to.length === 0) return { ok: false, reason: 'tidak ada penerima (isi OWNER_EMAIL / NOTIFY_EMAILS)' }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[email] Resend menolak:', res.status, body.slice(0, 300))
      return { ok: false, reason: `Resend ${res.status}` }
    }
    return { ok: true }
  } catch (err) {
    console.error('[email] gagal kirim:', err)
    return { ok: false, reason: 'koneksi ke Resend gagal' }
  }
}

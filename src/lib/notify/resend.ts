// Pengirim email lewat REST API Resend (tanpa SDK). Tidak pernah melempar error:
// email adalah pelengkap, kegagalannya tidak boleh menggagalkan pekerjaan utama.
const FROM = process.env.RESEND_FROM || 'JJ Teknik <onboarding@resend.dev>'

export type MailResult =
  | { ok: true; sent: string[]; failed: { to: string; reason: string }[] }
  | { ok: false; sent: string[]; failed: { to: string; reason: string }[]; reason: string }

async function sendOne(key: string, to: string, subject: string, html: string, text: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) return null
    const raw = await res.text().catch(() => '')
    let msg = raw.slice(0, 300)
    try { msg = (JSON.parse(raw) as { message?: string }).message ?? msg } catch { /* bukan JSON */ }
    return `Resend ${res.status}: ${msg}`
  } catch (err) {
    return `koneksi ke Resend gagal (${err instanceof Error ? err.message : 'tidak diketahui'})`
  }
}

// Dikirim SATU PER SATU: tanpa domain terverifikasi Resend menolak penerima selain email akunnya,
// dan satu penerima yang ditolak tidak boleh menggagalkan yang lain.
export async function sendEmail(opts: { to: string[]; subject: string; html: string; text: string }): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, sent: [], failed: [], reason: 'RESEND_API_KEY belum diset' }
  if (opts.to.length === 0) return { ok: false, sent: [], failed: [], reason: 'tidak ada penerima: isi OWNER_EMAIL / NOTIFY_EMAILS di .env.local' }

  const sent: string[] = []
  const failed: { to: string; reason: string }[] = []
  for (const to of opts.to) {
    const err = await sendOne(key, to, opts.subject, opts.html, opts.text)
    if (err) failed.push({ to, reason: err })
    else sent.push(to)
  }
  if (sent.length === 0) return { ok: false, sent, failed, reason: failed.map((f) => `${f.to}: ${f.reason}`).join(' | ') }
  return { ok: true, sent, failed }
}

// Catat hasil pengiriman di log server supaya tidak pernah diam-diam.
export function logMail(label: string, res: MailResult) {
  if (res.ok && res.failed.length === 0) console.log(`[email] ${label}: terkirim ke ${res.sent.join(', ')}`)
  else if (res.ok) console.warn(`[email] ${label}: sebagian gagal. Terkirim: ${res.sent.join(', ')}. Gagal: ${res.failed.map((f) => `${f.to} (${f.reason})`).join('; ')}`)
  else console.error(`[email] ${label}: GAGAL. ${res.reason}`)
}

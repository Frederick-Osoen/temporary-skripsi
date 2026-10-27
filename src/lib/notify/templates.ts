export const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
export const rupiah = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID')
export const dateId = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export type Row = [label: string, value: string]

// Kerangka email sederhana (inline style, aman untuk klien email)
export function layout(title: string, intro: string, rows: Row[], cta?: { href: string; label: string }) {
  const tr = rows
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#4B5D70;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;color:#070F1F">${esc(v)}</td></tr>`)
    .join('')
  const html = `<!doctype html><html><body style="margin:0;background:#F5FAFC;padding:24px;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #e3edf2">
<p style="margin:0 0 4px;color:#0A7894;font-size:12px;font-weight:bold;letter-spacing:.06em">JJ TEKNIK</p>
<h1 style="margin:0 0 12px;font-size:20px;color:#070F1F">${esc(title)}</h1>
<p style="margin:0 0 16px;color:#4B5D70;line-height:1.5">${esc(intro)}</p>
<table style="border-collapse:collapse;font-size:14px;width:100%">${tr}</table>
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.href)}" style="background:#FFB547;color:#2a1700;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold;display:inline-block">${esc(cta.label)}</a></p>` : ''}
</div></body></html>`
  const text = `${title}\n\n${intro}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}${cta ? `\n\n${cta.label}: ${cta.href}` : ''}`
  return { html, text }
}

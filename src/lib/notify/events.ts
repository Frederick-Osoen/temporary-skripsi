import { createAdminClient } from '@/lib/supabase/admin'
import { opsRecipients, ownerRecipients } from './recipients'
import { logMail, sendEmail, type MailResult } from './resend'

const deliver = async (label: string, p: Parameters<typeof sendEmail>[0]): Promise<MailResult> => {
  const r = await sendEmail(p)
  logMail(label, r)
  return r
}
import { SITE, dateId, layout, rupiah, type Row } from './templates'

type OrderBrief = { code: string; customer: string; status: string; start: string; dest: string; total: number }

async function orderBrief(orderId: string): Promise<OrderBrief | null> {
  const { data } = await createAdminClient()
    .from('orders')
    .select('order_code, status, start_date, destination, total_amount, customers(name)')
    .eq('id', orderId)
    .maybeSingle()
  if (!data) return null
  const c = Array.isArray(data.customers) ? data.customers[0] : data.customers
  return {
    code: data.order_code as string,
    customer: (c as { name?: string } | null)?.name ?? '-',
    status: data.status as string,
    start: data.start_date as string,
    dest: data.destination as string,
    total: Number(data.total_amount),
  }
}

// 1) Lead baru dari situs publik
export async function notifyNewLead(lead: { customer_name: string; total_estimate: number; payload: { items: { name: string; qty: number }[]; start_date: string; end_date: string; destination: string | null; delivery: string } }) {
  const p = lead.payload
  const rows: Row[] = [
    ['Nama', lead.customer_name],
    ['Barang', p.items.map((i) => `${i.name} × ${i.qty}`).join(', ')],
    ['Tanggal', p.start_date === p.end_date ? p.start_date : `${p.start_date} s/d ${p.end_date}`],
    ['Lokasi', p.delivery === 'store_pickup' ? 'Ambil di toko' : p.destination ?? '-'],
    ['Estimasi', rupiah(lead.total_estimate)],
  ]
  const { html, text } = layout('Permintaan baru dari situs', 'Seseorang menekan tombol WhatsApp di estimator. Cek chat WhatsApp Anda, lalu jadikan pesanan bila deal.', rows, {
    href: `${SITE}/dashboard/leads`,
    label: 'Buka Leads',
  })
  return deliver('lead baru', { to: await opsRecipients(), subject: `Permintaan baru: ${lead.customer_name} (${rupiah(lead.total_estimate)})`, html, text })
}

// 2) Audit ke owner: pembatalan, buka kunci, ubah/hapus pembayaran
export type AuditKind = 'cancel' | 'override' | 'payment_edit' | 'payment_delete'
const AUDIT_TITLE: Record<AuditKind, string> = {
  cancel: 'Pesanan dibatalkan',
  override: 'Pesanan terkunci dibuka (override)',
  payment_edit: 'Pembayaran diubah',
  payment_delete: 'Pembayaran dihapus',
}

export async function notifyAudit(a: { kind: AuditKind; orderId: string; actor: string; reason?: string | null }) {
  const o = await orderBrief(a.orderId)
  const rows: Row[] = [
    ['Pesanan', o ? `${o.code} (${o.customer})` : a.orderId],
    ['Dilakukan oleh', a.actor],
    ['Alasan', a.reason?.trim() || '-'],
    ['Waktu', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'],
  ]
  if (o) rows.splice(2, 0, ['Total pesanan', rupiah(o.total)])
  const { html, text } = layout(AUDIT_TITLE[a.kind], 'Pemberitahuan otomatis untuk owner. Tidak perlu dibalas.', rows, {
    href: `${SITE}/dashboard/orders/${a.orderId}`,
    label: 'Lihat pesanan',
  })
  return deliver(`audit ${a.kind}`, { to: ownerRecipients(), subject: `[Audit] ${AUDIT_TITLE[a.kind]}${o ? ` – ${o.code}` : ''}`, html, text })
}

// 3) Kegagalan sistem (mis. sinkron kalender) ke admin
export async function notifyFailure(title: string, detail: string, orderId?: string) {
  const rows: Row[] = [['Detail', detail], ['Waktu', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB']]
  if (orderId) {
    const o = await orderBrief(orderId)
    if (o) rows.unshift(['Pesanan', `${o.code} (${o.customer})`])
  }
  const { html, text } = layout(title, 'Sistem akan mencoba lagi otomatis setiap pagi. Bila terus gagal, periksa pengaturan di .env.', rows, {
    href: orderId ? `${SITE}/dashboard/orders/${orderId}` : `${SITE}/dashboard`,
    label: 'Buka dashboard',
  })
  return deliver('kegagalan', { to: await opsRecipients(), subject: `[Gagal] ${title}`, html, text })
}

// 4) Ringkasan pagi: pembongkaran hari ini + jadwal H-1 / H-2
export type DigestOrder = { id: string; code: string; customer: string; phone: string; dest: string; start: string; daysLeft: 1 | 2; hasRental: boolean; status: string }
// Pesanan sewa yang acaranya berakhir kemarin: unit harus diambil hari ini
export type TeardownOrder = { id: string; code: string; customer: string; phone: string; dest: string; end: string; unpaid: boolean }

export async function sendDailyDigest(list: DigestOrder[], teardown: TeardownOrder[] = []) {
  if (list.length === 0 && teardown.length === 0) return { ok: true as const, skipped: true }

  const tearRows: Row[] = [...teardown]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((o) => [
      'BONGKAR',
      `${o.code} · ${o.customer} (${o.phone}) · ${o.dest} · acara selesai ${dateId(o.end)}${o.unpaid ? ' · BELUM LUNAS, tagih saat pengambilan' : ''}`,
    ])
  const aheadRows: Row[] = [...list]
    .sort((a, b) => a.daysLeft - b.daysLeft || a.code.localeCompare(b.code))
    .map((o) => [
      `H-${o.daysLeft}`,
      `${o.code} · ${o.customer} (${o.phone}) · ${o.dest} · ${dateId(o.start)}${o.hasRental && o.daysLeft === 1 ? ' · PASANG HARI INI' : ''}${o.status === 'pending_dp' ? ' · DP BELUM MASUK' : ''}`,
    ])

  const parts = [
    teardown.length > 0 ? `${teardown.length} bongkar hari ini` : null,
    list.length > 0 ? `${list.length} pesanan dalam 2 hari ke depan` : null,
  ].filter(Boolean) as string[]
  const intro = teardown.length > 0
    ? 'Ringkasan pagi. Kabari tim lapangan untuk mengangkut unit yang acaranya sudah selesai, dan pastikan unit, armada, dan DP jadwal berikutnya siap.'
    : 'Ringkasan pagi. Pastikan unit, armada, dan DP sudah siap.'

  const { html, text } = layout(`Jadwal: ${parts.join(', ')}`, intro, [...tearRows, ...aheadRows], {
    href: `${SITE}/dashboard/calendar`,
    label: 'Buka kalender',
  })
  const subject = teardown.length > 0
    ? `Bongkar hari ini: ${teardown.length} pesanan${list.length > 0 ? ` · jadwal ${list.length}` : ''}`
    : `Jadwal H-1/H-2: ${list.length} pesanan`
  const res = await deliver('ringkasan harian', { to: await opsRecipients(), subject, html, text })
  return res.ok ? { ok: true as const, skipped: false } : { ok: false as const, reason: res.reason }
}

import { createAdminClient } from '@/lib/supabase/admin'
import { opsRecipients, ownerRecipients } from './recipients'
import { sendEmail } from './resend'
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
  return sendEmail({ to: opsRecipients(), subject: `Permintaan baru: ${lead.customer_name} (${rupiah(lead.total_estimate)})`, html, text })
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
  return sendEmail({ to: ownerRecipients(), subject: `[Audit] ${AUDIT_TITLE[a.kind]}${o ? ` – ${o.code}` : ''}`, html, text })
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
  return sendEmail({ to: opsRecipients(), subject: `[Gagal] ${title}`, html, text })
}

// 4) Ringkasan harian H-1 / H-2
export type DigestOrder = { id: string; code: string; customer: string; phone: string; dest: string; start: string; daysLeft: 1 | 2; hasRental: boolean; status: string }

export async function sendDailyDigest(list: DigestOrder[]) {
  if (list.length === 0) return { ok: true as const, skipped: true }
  const rows: Row[] = list
    .sort((a, b) => a.daysLeft - b.daysLeft || a.code.localeCompare(b.code))
    .map((o) => [
      `H-${o.daysLeft}`,
      `${o.code} · ${o.customer} (${o.phone}) · ${o.dest} · ${dateId(o.start)}${o.hasRental && o.daysLeft === 1 ? ' · PASANG HARI INI' : ''}${o.status === 'pending_dp' ? ' · DP BELUM MASUK' : ''}`,
    ])
  const { html, text } = layout(`Jadwal: ${list.length} pesanan dalam 2 hari ke depan`, 'Ringkasan pagi. Pastikan unit, armada, dan DP sudah siap.', rows, {
    href: `${SITE}/dashboard/calendar`,
    label: 'Buka kalender',
  })
  const res = await sendEmail({ to: opsRecipients(), subject: `Jadwal H-1/H-2: ${list.length} pesanan`, html, text })
  return res.ok ? { ok: true as const, skipped: false } : res
}

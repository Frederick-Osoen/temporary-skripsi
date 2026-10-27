'use server'

import { requireOwner } from '@/lib/auth'
import { calendarConfigured, createEvent, deleteEvent } from '@/lib/calendar/google'
import { opsRecipients, opsSource, ownerRecipients } from '@/lib/notify/recipients'
import { logMail, sendEmail } from '@/lib/notify/resend'
import { runDailyJob } from '@/lib/cron/daily'
import { layout, SITE } from '@/lib/notify/templates'

export type TestResult = { ok: boolean; lines: string[]; eventId?: string }

// Hanya menampilkan ADA/TIDAK ADA, tidak pernah nilainya.
export async function getNotifyStatus(): Promise<{ label: string; ok: boolean; hint: string }[]> {
  const has = (v: string | undefined) => !!v?.trim()
  return [
    { label: 'RESEND_API_KEY', ok: has(process.env.RESEND_API_KEY), hint: 'Kunci API dari resend.com' },
    { label: 'OWNER_EMAIL', ok: ownerRecipients().length > 0, hint: 'Penerima audit; harus format email valid' },
    {
      label: 'Penerima email operasional',
      ok: (await opsRecipients()).length > 0,
      hint: (await opsSource()) === 'dashboard' ? 'Diatur di kartu "Penerima email" di atas' : 'Dari NOTIFY_EMAILS di .env; bisa diganti di kartu "Penerima email" di atas',
    },
    { label: 'GOOGLE_CALENDAR_CLIENT_EMAIL', ok: has(process.env.GOOGLE_CALENDAR_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL), hint: 'client_email dari JSON service account' },
    { label: 'GOOGLE_CALENDAR_PRIVATE_KEY', ok: has(process.env.GOOGLE_CALENDAR_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY), hint: 'private_key dari JSON service account' },
    { label: 'GOOGLE_CALENDAR_ID', ok: has(process.env.GOOGLE_CALENDAR_ID), hint: 'ID kalender yang dibagikan ke bot' },
    { label: 'CRON_SECRET', ok: has(process.env.CRON_SECRET), hint: 'Dibutuhkan endpoint cron harian' },
  ]
}

export async function sendTestEmail(): Promise<TestResult> {
  try {
    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, lines: [ctx.error] }
    const to = Array.from(new Set([...ownerRecipients(), ...(await opsRecipients())]))
    const { html, text } = layout('Email uji', 'Jika Anda membaca ini, pengiriman email JJ Teknik berfungsi.', [['Dikirim oleh', ctx.name]], { href: `${SITE}/dashboard`, label: 'Buka dashboard' })
    const res = await sendEmail({ to, subject: 'Email uji JJ Teknik', html, text })
    logMail('email uji', res)
    const lines = [
      ...res.sent.map((t) => `Terkirim ke ${t}`),
      ...res.failed.map((f) => `GAGAL ke ${f.to}: ${f.reason}`),
    ]
    if (!res.ok) lines.unshift(res.reason)
    if (res.failed.some((f) => f.reason.includes('403'))) {
      lines.push('Resend tanpa domain terverifikasi hanya mau mengirim ke email akun Resend Anda. Hapus email lain dari .env.local untuk tes, atau verifikasi domain di resend.com/domains.')
    }
    return { ok: res.ok, lines }
  } catch (err) {
    console.error('[settings] uji email:', err)
    return { ok: false, lines: ['Terjadi kesalahan pada server.'] }
  }
}

export async function testCalendar(): Promise<TestResult> {
  try {
    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, lines: [ctx.error] }
    if (!calendarConfigured()) return { ok: false, lines: ['Env Google Calendar belum lengkap (lihat daftar di atas).'] }
    const date = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
    const id = await createEvent({ summary: 'UJI SINKRON JJ Teknik (boleh dihapus)', description: 'Event uji dari Dashboard > Pengaturan.', date, colorId: '9', orderId: 'uji' })
    return { ok: true, eventId: id, lines: [`Berhasil: event biru "UJI SINKRON JJ Teknik" dibuat di kalender untuk hari ini (${date}). Buka Google Calendar untuk melihatnya, lalu tekan "Hapus event uji".`] }
  } catch (err) {
    console.error('[settings] uji kalender:', err)
    return { ok: false, lines: [err instanceof Error ? err.message : 'Gagal.'] }
  }
}

export async function removeTestEvent(eventId: string): Promise<TestResult> {
  try {
    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, lines: [ctx.error] }
    if (typeof eventId !== 'string' || !/^[a-z0-9]{5,100}$/i.test(eventId)) return { ok: false, lines: ['ID event tidak valid.'] }
    await deleteEvent(eventId)
    return { ok: true, lines: ['Event uji dihapus dari kalender.'] }
  } catch (err) {
    console.error('[settings] hapus event uji:', err)
    return { ok: false, lines: [err instanceof Error ? err.message : 'Gagal.'] }
  }
}

// Menjalankan pekerjaan harian sekarang juga (tanpa curl), untuk menguji email pagi (bongkar + H-1/H-2) dan sinkron ulang.
export async function runDailyNow(): Promise<TestResult> {
  try {
    const ctx = await requireOwner()
    if (!ctx.ok) return { ok: false, lines: [ctx.error] }
    const r = await runDailyJob()
    if (!r.ok) return { ok: false, lines: [`Gagal membaca pesanan: ${r.error}`] }
    const d = r.digest
    return {
      ok: !('reason' in d),
      lines: [
        `Pesanan H-1/H-2 ditemukan: ${r.orders}`,
        `Pembongkaran hari ini (acara selesai kemarin): ${r.teardown}`,
        r.orders === 0 && r.teardown === 0 ? 'Tidak ada jadwal bongkar maupun pesanan untuk besok/lusa, jadi email ringkasan tidak dikirim (normal).' : 'reason' in d ? `Email ringkasan GAGAL: ${d.reason}` : 'Email ringkasan terkirim.',
        `Sinkron kalender diulang untuk ${r.sync.attempted} pesanan.`,
      ],
    }
  } catch (err) {
    console.error('[settings] jalankan cron:', err)
    return { ok: false, lines: ['Terjadi kesalahan pada server.'] }
  }
}

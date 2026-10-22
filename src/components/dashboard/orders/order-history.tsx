import type { HistoryRow, PaymentSnapshot } from '@/lib/orders/detail'
import { STATUS_LABEL } from '@/lib/orders/status'
import { formatRupiah } from '@/lib/orders/utils'
import {
  PAYMENT_METHOD_LABEL, PAYMENT_TYPE_LABEL, type PaymentMethod, type PaymentType,
} from '@/lib/orders/payments'
import { Section } from './ui'

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(iso))

const typeLabel = (t: string) => PAYMENT_TYPE_LABEL[t as PaymentType] ?? t
const methodLabel = (m: string) => PAYMENT_METHOD_LABEL[m as PaymentMethod] ?? m

function changes(b: PaymentSnapshot, a: PaymentSnapshot): string[] {
  const out: string[] = []
  if (Number(b.amount) !== Number(a.amount)) out.push(`Nominal ${formatRupiah(Number(b.amount))} → ${formatRupiah(Number(a.amount))}`)
  if (b.type !== a.type) out.push(`Jenis ${typeLabel(b.type)} → ${typeLabel(a.type)}`)
  if (b.method !== a.method) out.push(`Metode ${methodLabel(b.method)} → ${methodLabel(a.method)}`)
  if (b.paid_at !== a.paid_at) out.push(`Tanggal ${b.paid_at} → ${a.paid_at}`)
  if ((b.notes ?? '') !== (a.notes ?? '')) out.push('Catatan diubah')
  return out
}

function describe(h: HistoryRow): { title: string; lines: string[] } {
  const b = h.details?.before
  const a = h.details?.after
  switch (h.action) {
    case 'created':
      return { title: `Pesanan dibuat (${STATUS_LABEL[h.to_status]})`, lines: [] }
    case 'override_edit':
      return { title: 'Pesanan diedit oleh owner (buka kunci)', lines: [] }
    case 'payment_edit':
      return { title: 'Pembayaran diedit', lines: b && a ? changes(b, a) : [] }
    case 'payment_delete':
      return {
        title: 'Pembayaran dihapus',
        lines: b ? [`${typeLabel(b.type)} ${formatRupiah(Number(b.amount))} (${methodLabel(b.method)}, ${b.paid_at})`] : [],
      }
    case 'allocation': {
      const d = h.details
      const lines: string[] = []
      if (d) {
        lines.push(`Terisi ${(d.assigned ?? 0) + (d.outsourced ?? 0)} dari ${d.needed ?? 0} unit (vendor: ${d.outsourced ?? 0})`)
        if (d.units?.length) lines.push(`Unit: ${d.units.join(', ')}`)
      }
      return { title: 'Alokasi unit diperbarui', lines }
    }
    case 'schedule': {
      const d = h.details
      return {
        title: 'Jadwal operasional diperbarui',
        lines: d ? [`${d.days ?? 0} hari terjadwal, overtime ${d.overtime_hours ?? 0} jam (${formatRupiah(Number(d.overtime_fee ?? 0))})`] : [],
      }
    }
    case 'extension': {
      const d = h.details
      return {
        title: 'Sewa diperpanjang',
        lines: d
          ? [
            `Selesai ${d.old_end} → ${d.new_end} (+${d.added_days} hari)`,
            `Total ${formatRupiah(Number(d.old_total ?? 0))} → ${formatRupiah(Number(d.new_total ?? 0))}`,
          ]
          : [],
      }
    }

    default:
      return { title: `${h.from_status ? STATUS_LABEL[h.from_status] : '-'} → ${STATUS_LABEL[h.to_status]}`, lines: [] }
  }
}

export function OrderHistory({ history }: { history: HistoryRow[] }) {
  return (
    <Section title="Riwayat">
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
      ) : (
        <ol className="space-y-3">
          {history.map((h) => {
            const d = describe(h)
            return (
              <li key={h.id} className="border-l-2 pl-3 text-sm">
                <p className="font-medium">{d.title}</p>
                {d.lines.map((line) => (
                  <p key={line} className="text-xs text-muted-foreground">{line}</p>
                ))}
                {h.note && <p className="text-muted-foreground">&ldquo;{h.note}&rdquo;</p>}
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(h.created_at)} · {h.changed_by_name ?? 'Sistem'}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </Section>
  )
}
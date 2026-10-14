import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AssetRow } from '@/lib/validations/asset'

const TYPE_LABEL = {
  service_kecil: 'Cuci / Service Kecil',
  service_besar: 'Service Besar',
} as const

// 'YYYY-MM-DD' ditampilkan apa adanya tanpa geser zona waktu
const formatDate = (d: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${d}T00:00:00Z`)
  )

export function MaintenanceHistory({ asset }: { asset: AssetRow }) {
  if (asset.logs.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada riwayat servis untuk unit ini.</p>
  }

  return (
    <div className="max-h-[60vh] overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Total sewa saat itu</TableHead>
            <TableHead>Catatan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {asset.logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">{formatDate(log.service_date)}</TableCell>
              <TableCell>
                <Badge variant={log.type === 'service_besar' ? 'default' : 'secondary'}>{TYPE_LABEL[log.type]}</Badge>
              </TableCell>
              <TableCell>{log.rental_count_at_service}x</TableCell>
              <TableCell className="min-w-40 text-muted-foreground">{log.description ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
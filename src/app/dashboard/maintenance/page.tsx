import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { MAINTENANCE_RULES } from '@/lib/maintenance'
import { loadMaintenanceOverview, type MaintenanceUnit } from '@/lib/maintenance-overview'

export const metadata = { title: 'Maintenance' }

const STATUS_LABEL: Record<MaintenanceUnit['status'], string> = {
  available: 'Tersedia',
  allocated: 'Dialokasikan',
  maintenance: 'Dalam perawatan',
  damaged: 'Rusak',
}

function Track({ label, since, warn, urgent }: { label: string; since: number; warn: number; urgent: number }) {
  const pct = Math.min(100, Math.round((since / urgent) * 100))
  const tone = since >= urgent ? 'bg-destructive' : since >= warn ? 'bg-volt' : 'bg-primary'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{since} / {urgent} sewa</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuenow={since} aria-valuemin={0} aria-valuemax={urgent}>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { units, error } = await loadMaintenanceOverview(supabase)

  if (error) return <p className="text-sm text-destructive">Gagal memuat data perawatan: {error}</p>

  // Unit rusak / sedang diservis ditampilkan tersendiri: status fisik lebih penting daripada hitungan sewa
  const down = units.filter((u) => u.status === 'damaged' || u.status === 'maintenance')
  const active = units.filter((u) => u.status !== 'damaged' && u.status !== 'maintenance')
  const urgent = active.filter((u) => u.alert.level === 'urgent')
  const warning = active.filter((u) => u.alert.level === 'warning')
  const ok = active.filter((u) => u.alert.level === 'ok')
  const needs = [...urgent, ...warning]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Maintenance</h1>
          <p className="text-sm text-muted-foreground">
            Peringatan perawatan unit AC. Cuci AC: peringatan di {MAINTENANCE_RULES.cuci.warn}x sewa, mendesak di {MAINTENANCE_RULES.cuci.urgent}x.
            Service besar: peringatan di {MAINTENANCE_RULES.besar.warn}x, mendesak di {MAINTENANCE_RULES.besar.urgent}x (dihitung sejak servis terakhir).
          </p>
        </div>
        <Link href="/dashboard/assets" className={buttonVariants({ variant: 'outline' })}>
          <Wrench className="mr-2 h-4 w-4" /> Catat servis di Aset Fisik
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-background p-4">
          <p className={`text-2xl font-bold tabular-nums ${down.length > 0 ? 'text-destructive' : ''}`}>{down.length}</p>
          <p className="text-xs text-muted-foreground">Rusak / diservis</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-2xl font-bold tabular-nums text-destructive">{urgent.length}</p>
          <p className="text-xs text-muted-foreground">Mendesak</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-2xl font-bold tabular-nums text-warning">{warning.length}</p>
          <p className="text-xs text-muted-foreground">Segera dijadwalkan</p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-2xl font-bold tabular-nums text-success">{ok.length}</p>
          <p className="text-xs text-muted-foreground">Normal</p>
        </div>
      </div>

      {units.length === 0 && (
        <p className="rounded-xl border border-dashed bg-background py-12 text-center text-sm text-muted-foreground">
          Belum ada unit AC terdaftar. Tambahkan di menu Aset Fisik.
        </p>
      )}

      {down.length > 0 && (
        <section aria-labelledby="down" className="space-y-3">
          <h2 id="down" className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" /> Tidak bisa disewakan ({down.length})
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {down.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <div>
                  <p className="font-semibold">{u.asset_code}</p>
                  <p className="text-xs text-muted-foreground">{u.product_name} · total {u.total_count}x sewa</p>
                </div>
                <Badge variant="outline" className="border-red-300 bg-red-100 text-red-800">{STATUS_LABEL[u.status]}</Badge>
              </li>
            ))}
          </ul>
          <Link href="/dashboard/assets" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Ubah status unit di Aset Fisik
          </Link>
        </section>
      )}

      {units.length > 0 && needs.length === 0 && down.length === 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          Semua unit AC dalam kondisi normal. Tidak ada perawatan yang jatuh tempo.
        </div>
      )}

      {needs.length > 0 && (
        <section aria-labelledby="perlu" className="space-y-3">
          <h2 id="perlu" className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" /> Perlu perawatan ({needs.length})
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {needs.map((u) => (
              <li key={u.id} className="space-y-3 rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{u.asset_code}</p>
                    <p className="text-xs text-muted-foreground">{u.product_name} · {STATUS_LABEL[u.status]}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={u.alert.level === 'urgent' ? 'border-red-300 bg-red-100 text-red-800' : 'border-amber-300 bg-amber-100 text-amber-800'}
                  >
                    {u.alert.label}
                  </Badge>
                </div>
                <Track label="Cuci AC" since={u.alert.cuci.since} warn={MAINTENANCE_RULES.cuci.warn} urgent={MAINTENANCE_RULES.cuci.urgent} />
                <Track label="Service besar" since={u.alert.besar.since} warn={MAINTENANCE_RULES.besar.warn} urgent={MAINTENANCE_RULES.besar.urgent} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {ok.length > 0 && (
        <details className="rounded-xl border bg-background p-4">
          <summary className="cursor-pointer text-sm font-medium">Unit normal ({ok.length})</summary>
          <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {ok.map((u) => (
              <li key={u.id} className="flex justify-between gap-2 border-b py-1 last:border-0">
                <span>{u.asset_code}</span>
                <span className="text-xs text-muted-foreground tabular-nums">cuci {u.alert.cuci.since}/{MAINTENANCE_RULES.cuci.urgent}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

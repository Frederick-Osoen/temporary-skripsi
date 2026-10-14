export const MAINTENANCE_RULES = {
  cuci: { warn: 15, urgent: 20 },
  besar: { warn: 30, urgent: 40 },
} as const

export type MaintenanceLog = {
  type: 'service_kecil' | 'service_besar'
  rental_count_at_service: number
}

type Level = 'ok' | 'warning' | 'urgent'

export type TrackStatus = {
  since: number // sewa sejak servis terakhir (atau sejak hitungan awal)
  level: Level
  warnAt: number // total_count saat peringatan berikutnya muncul
  urgentAt: number
}

export type MaintenanceAlert = {
  level: Level
  label: string
  since: number
  cuci: TrackStatus
  besar: TrackStatus
}

export const isAcProduct = (name: string) => /^ac\b/i.test(name.trim())

function evaluateTrack(total: number, anchor: number, rule: { warn: number; urgent: number }): TrackStatus {
  const since = Math.max(0, total - anchor) // jaga-jaga jika data diedit mundur
  const level: Level = since >= rule.urgent ? 'urgent' : since >= rule.warn ? 'warning' : 'ok'
  return { since, level, warnAt: anchor + rule.warn, urgentAt: anchor + rule.urgent }
}

export function evaluateMaintenance(
  initialCount: number,
  rentalCount: number,
  logs: MaintenanceLog[]
): MaintenanceAlert {
  const total = initialCount + rentalCount

  // Titik acuan: unit baru dianggap bersih pada initial_count; servis nyata menggesernya maju
  const anchorCuci = Math.max(initialCount, ...logs.map((l) => l.rental_count_at_service))
  const anchorBesar = Math.max(
    initialCount,
    ...logs.filter((l) => l.type === 'service_besar').map((l) => l.rental_count_at_service)
  )

  const cuci = evaluateTrack(total, anchorCuci, MAINTENANCE_RULES.cuci)
  const besar = evaluateTrack(total, anchorBesar, MAINTENANCE_RULES.besar)

  // Jalur Besar menang jika sudah aktif (service besar mencakup cuci)
  const main = besar.level !== 'ok' ? besar : cuci
  const name = besar.level !== 'ok' ? 'Service Besar' : 'Cuci AC'

  if (main.level === 'ok') return { level: 'ok', label: 'Normal', since: cuci.since, cuci, besar }

  const label = main.level === 'urgent' ? `${name} mendesak` : `Segera ${name}`
  return { level: main.level, label, since: main.since, cuci, besar }
}
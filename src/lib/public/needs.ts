// Kalkulator kebutuhan: perkiraan jumlah AC dari luas area, jumlah tamu, dan jenis tempat.
// Kapasitas genset TIDAK dihitung di sini: halaman memakai recommendKva() dari aturan genset
// yang sudah dipakai estimator (tabel genset_rules), supaya angkanya konsisten.

export type Venue = 'tenda' | 'ruangan' | 'semi_terbuka' | 'gudang'

export const VENUE_LABEL: Record<Venue, string> = {
  tenda: 'Tenda acara',
  ruangan: 'Ruangan tertutup (aula, kantor)',
  semi_terbuka: 'Semi-terbuka',
  gudang: 'Gudang / area produksi',
}

export type NeedsInput = { areaM2: number; people?: number; venue: Venue }
export type NeedsResult = { acUnits: number; pk: number; kva: number | null }

// TODO(rumus): rumus final diisi bersama owner. Angka di bawah SEMENTARA, hanya supaya
// UI bisa dicoba: 1 unit AC standing 5 PK per ±25 m² ruangan tertutup, tenda & area
// panas butuh lebih banyak, dan tiap 40 tamu menambah beban ±1 unit.
const M2_PER_UNIT: Record<Venue, number> = { ruangan: 25, tenda: 20, semi_terbuka: 16, gudang: 18 }

export function estimateNeeds({ areaM2, people = 0, venue }: NeedsInput): NeedsResult {
  const area = Math.max(0, areaM2)
  const byArea = area / M2_PER_UNIT[venue]
  const byPeople = Math.max(0, people) / 40
  const acUnits = area === 0 && people === 0 ? 0 : Math.max(1, Math.ceil(Math.max(byArea, byPeople * 0.6 + byArea * 0.6)))
  return { acUnits, pk: 5, kva: null }
}

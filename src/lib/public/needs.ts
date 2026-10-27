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

// Dasar hitungan dari client (pertemuan 2026-10-27): 1 unit AC standing 5 PK paling optimal untuk
// ruangan ±4x5 m (20 m²) dan ±15-20 orang; bisa menjangkau sampai ±10x10 m tetapi tidak optimal.
// Di atas MANUAL_ABOVE unit (biasanya genset 250 kVA) kebutuhan dihitung manual oleh admin.
// TODO(owner): faktor tenda, semi-terbuka, dan gudang di bawah ini ASUMSI konservatif (area panas/terbuka
// butuh lebih banyak unit). Client belum memberi angka; konfirmasi lalu ubah di sini.
export const MANUAL_ABOVE = 20
export const PEOPLE_PER_UNIT = 18
const M2_PER_UNIT: Record<Venue, number> = { ruangan: 20, tenda: 16, semi_terbuka: 14, gudang: 16 }

export function estimateNeeds({ areaM2, people = 0, venue }: NeedsInput): NeedsResult {
  const area = Math.max(0, areaM2)
  const byArea = area / M2_PER_UNIT[venue]
  const byPeople = Math.max(0, people) / PEOPLE_PER_UNIT
  const acUnits = area === 0 && people === 0 ? 0 : Math.max(1, Math.ceil(Math.max(byArea, byPeople)))
  return { acUnits, pk: 5, kva: null }
}

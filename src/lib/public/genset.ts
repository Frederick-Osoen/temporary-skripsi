export type GensetRule = { min_ac: number; max_ac: number | null; kva: number }

export type GensetProduct = {
  id: string
  name: string
  base_price: number
  overtime_rate: number | null
  capacity_kva: number | null
}

// Total unit AC -> kapasitas genset (kVA). null jika tidak ada AC atau tidak ada aturan yang cocok.
export function recommendKva(acCount: number, rules: GensetRule[]): number | null {
  if (!Number.isInteger(acCount) || acCount < 1) return null
  const sorted = [...rules].sort((a, b) => a.min_ac - b.min_ac)
  return sorted.find((r) => acCount >= r.min_ac && (r.max_ac === null || acCount <= r.max_ac))?.kva ?? null
}

// Pemeriksaan aturan (dipakai editor di dashboard; fungsi SQL save_genset_rules memeriksa ulang di sisi database).
// Mengembalikan pesan kesalahan berbahasa Indonesia, atau null bila aturan valid.
export function validateGensetRules(rules: GensetRule[]): string | null {
  const sorted = [...rules].sort((a, b) => a.min_ac - b.min_ac)
  let prev: GensetRule | null = null
  for (const r of sorted) {
    if (r.min_ac < 1 || r.min_ac > 1000) return 'Jumlah AC awal harus antara 1 dan 1000.'
    if (r.kva < 1 || r.kva > 5000) return 'Kapasitas genset harus antara 1 dan 5000 kVA.'
    if (r.max_ac !== null && r.max_ac < r.min_ac) return `Batas atas (${r.max_ac}) lebih kecil dari batas bawah (${r.min_ac}).`
    if (prev && prev.max_ac === null) return 'Aturan tanpa batas atas harus menjadi baris terakhir.'
    if (prev && r.min_ac <= (prev.max_ac as number)) return `Rentang AC tumpang tindih di sekitar ${r.min_ac} unit.`
    prev = r
  }
  return null
}

// Batas atas jumlah AC yang masih dicakup aturan. null = ada aturan tanpa batas atas (tidak ada batas), 0 = belum ada aturan.
export function coveredAcLimit(rules: GensetRule[]): number | null {
  if (rules.length === 0) return 0
  if (rules.some((r) => r.max_ac === null)) return null
  return Math.max(...rules.map((r) => r.max_ac as number))
}

export const findGensetProduct = (products: GensetProduct[], kva: number) =>
  products.find((p) => p.capacity_kva === kva) ?? null
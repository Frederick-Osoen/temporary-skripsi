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

export const findGensetProduct = (products: GensetProduct[], kva: number) =>
  products.find((p) => p.capacity_kva === kva) ?? null
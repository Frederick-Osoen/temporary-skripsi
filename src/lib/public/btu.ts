// Perkiraan kebutuhan pendinginan (BTU/jam) untuk RUANGAN TERTUTUP berdinding. Patokan umum, bukan hitungan teknik.
// Tidak berlaku untuk tenda/area terbuka: pakai kalkulator kebutuhan acara untuk itu.
export const BTU_PER_M2 = 500 // plafon <= 3 m, ruangan biasa
export const BTU_PER_PERSON = 600 // per orang di atas 2 orang (500 BTU/m² sudah mengandaikan penghuni biasa)
export const BTU_PER_WATT = 3.412 // 1 watt = 3,412 BTU/jam (konstanta fisika)
export const BTU_PER_PK = 9000 // konversi kasar yang dipakai di Indonesia
export const STANDING_5PK_BTU = 5 * BTU_PER_PK

export type Sun = 'teduh' | 'biasa' | 'terik'
export const SUN_FACTOR: Record<Sun, number> = { teduh: 0.9, biasa: 1, terik: 1.1 }
export const SUN_LABEL: Record<Sun, string> = {
  teduh: 'Teduh (tidak kena matahari langsung)',
  biasa: 'Biasa',
  terik: 'Dinding/jendela kena matahari langsung',
}

export type BtuInput = { areaM2: number; ceilingM: number; people: number; equipmentWatt: number; sun: Sun }
export type BtuResult = { base: number; people: number; equipment: number; total: number; pk: number; standing5pk: number }

const num = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)

export function estimateBtu(i: BtuInput): BtuResult {
  const area = num(i.areaM2)
  const ceiling = Math.max(3, num(i.ceilingM) || 3) // plafon lebih tinggi menambah volume udara; di bawah 3 m tidak dikurangi
  const base = area * BTU_PER_M2 * (ceiling / 3) * SUN_FACTOR[i.sun]
  const people = Math.max(0, num(i.people) - 2) * BTU_PER_PERSON
  const equipment = num(i.equipmentWatt) * BTU_PER_WATT
  const total = Math.round(base + people + equipment)
  return {
    base: Math.round(base), people: Math.round(people), equipment: Math.round(equipment), total,
    pk: Math.round((total / BTU_PER_PK) * 10) / 10,
    standing5pk: total === 0 ? 0 : Math.ceil(total / STANDING_5PK_BTU),
  }
}

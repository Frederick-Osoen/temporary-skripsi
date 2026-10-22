export const FLEET_RULE = {
  pickupMaxUnits: 5,   // 5 unit AC per pickup
  truckMaxUnits: 12,   // 12 unit AC per truk
  mistyFanWeight: 0.5, // 1 Misty Fan = 0,5 unit AC -> 1 pickup ≈ 10 Misty Fan
}

export type FleetLine = {
  category: 'rental' | 'sales'
  qty: number
  capacity_kva: number | null
  name: string // dipakai untuk mengenali Misty Fan
}

export type FleetPlan = {
  pickups: number
  trucks: number
  gensetUnits: number
  cargoUnits: number // dalam satuan "setara AC", bisa pecahan
}

/** Bobot muat per unit, dalam satuan setara AC. */
export function cargoWeight(line: Pick<FleetLine, 'name'>): number {
  return /misty/i.test(line.name) ? FLEET_RULE.mistyFanWeight : 1
}

export function planFleet(lines: FleetLine[]): FleetPlan {
  const rental = lines.filter((l) => l.category === 'rental')

  const gensetUnits = rental
    .filter((l) => l.capacity_kva !== null)
    .reduce((s, l) => s + l.qty, 0)

  // Pembulatan ke 2 desimal agar 0.5 x n tidak menumpuk error floating point
  const cargoUnits =
    Math.round(
      rental
        .filter((l) => l.capacity_kva === null)
        .reduce((s, l) => s + l.qty * cargoWeight(l), 0) * 100
    ) / 100

  let pickups = gensetUnits // 1 genset = 1 pickup khusus
  let trucks = 0

  if (cargoUnits > 0) {
    trucks = Math.floor(cargoUnits / FLEET_RULE.truckMaxUnits)
    const rest = cargoUnits - trucks * FLEET_RULE.truckMaxUnits
    if (rest > 0) {
      if (rest <= FLEET_RULE.pickupMaxUnits) pickups += 1
      else trucks += 1
    }
  }

  // Hanya produk beli (atau tidak ada armada sama sekali) -> default 1 pickup
  if (pickups === 0 && trucks === 0 && lines.length > 0) pickups = 1

  return { pickups, trucks, gensetUnits, cargoUnits }
}
import { calcItemsTotal, rentalDays } from '@/lib/orders/utils'
import { billableHours, calcHours, overtimeOf } from '@/lib/orders/schedule'
import type { FleetPlan } from './fleet'

export type EstimateLine = {
  product_id: string
  name: string
  category: 'rental' | 'sales'
  qty: number
  unit_price: number
  overtime_rate: number | null
  capacity_kva: number | null // terisi hanya untuk genset
}

export type EstimateInput = {
  lines: EstimateLine[]
  start_date: string
  end_date: string
  start_time: string // satu pasang jam untuk semua hari (HH:MM)
  end_time: string
  delivery: 'delivery' | 'store_pickup'
  plan: FleetPlan
  // hasil /api/distance: biaya satu kendaraan per jenis (null = tidak bisa dipastikan)
  shipping: { zone: 1 | 2 | 3 | null; perFleet: { pickup: number | null; truck: number | null } | null }
}

export type EstimateResult = {
  hasRental: boolean
  days: number
  itemsTotal: number
  hoursPerDay: number | null
  overtimeHoursPerDay: number
  overtimeFee: number
  overtimeUnpriced: boolean
  shippingFee: number | null
  shippingPending: boolean
  total: number
}

export function calcEstimate(input: EstimateInput): EstimateResult {
  const rental = input.lines.filter((l) => l.category === 'rental')
  const hasRental = rental.length > 0
  const days = hasRental ? rentalDays(input.start_date, input.end_date) : 1

  const itemsTotal = calcItemsTotal(
    input.lines.map((l) => ({ qty: l.qty, unit_price: l.unit_price, is_rental: l.category === 'rental' })),
    days
  )

  // Sama dengan SQL calc_overtime_fee: jam ditagih dibulatkan ke atas per hari x tarif semua unit
  const hours = hasRental && input.start_time && input.end_time ? calcHours(input.start_time, input.end_time) : null
  const overtimePerDay = hours === null ? 0 : overtimeOf(hours)
  const ratePerHour = rental.reduce((s, l) => s + (l.overtime_rate === null ? 0 : l.qty * l.overtime_rate), 0)
  const overtimeFee = billableHours(overtimePerDay) * days * ratePerHour
  const overtimeUnpriced = overtimePerDay > 0 && rental.some((l) => l.capacity_kva !== null && l.overtime_rate === null)

  let shippingFee: number | null = 0
  let shippingPending = false
  if (input.delivery === 'delivery') {
    const { zone, perFleet } = input.shipping
    if (zone === 1) {
      shippingFee = 0
    } else if (zone === 2 && perFleet) {
      const { pickups, trucks } = input.plan
      const pickupPart = pickups === 0 ? 0 : perFleet.pickup === null ? null : pickups * perFleet.pickup
      const truckPart = trucks === 0 ? 0 : perFleet.truck === null ? null : trucks * perFleet.truck
      if (pickupPart === null || truckPart === null) {
        shippingFee = null
        shippingPending = true
      } else {
        shippingFee = pickupPart + truckPart
      }
    } else {
      shippingFee = null // zona 3 / belum dihitung / peta bermasalah
      shippingPending = true
    }
  }

  return {
    hasRental, days, itemsTotal,
    hoursPerDay: hours,
    overtimeHoursPerDay: overtimePerDay,
    overtimeFee, overtimeUnpriced,
    shippingFee, shippingPending,
    total: itemsTotal + (shippingFee ?? 0) + overtimeFee,
  }
}
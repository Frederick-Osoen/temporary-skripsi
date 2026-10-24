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
  start_time: string // jam bawaan (HH:MM), dipakai bila day_hours tidak diberikan
  end_time: string
  // Jam per hari (opsional). Bila ada, menggantikan start_time/end_time untuk perhitungan overtime.
  day_hours?: { date: string; start: string; end: string }[]
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
  overtimeHoursTotal: number // jumlah overtime semua hari (jam)
  hoursVary: boolean // jam berbeda antar hari
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
  const ratePerHour = rental.reduce((s, l) => s + (l.overtime_rate === null ? 0 : l.qty * l.overtime_rate), 0)
  let hours: number | null = null // jam/hari bila seragam
  let overtimePerDay = 0
  let overtimeTotal = 0
  let billable = 0
  let hoursVary = false

  if (hasRental && input.day_hours && input.day_hours.length > 0) {
    const per = input.day_hours.map((d) => (d.start && d.end ? calcHours(d.start, d.end) : null))
    const valid = per.filter((h): h is number => h !== null)
    const ots = valid.map(overtimeOf)
    overtimeTotal = ots.reduce((a, b) => a + b, 0)
    billable = ots.reduce((a, o) => a + billableHours(o), 0)
    hoursVary = new Set(valid).size > 1
    hours = !hoursVary && valid.length > 0 ? valid[0] : null
    overtimePerDay = !hoursVary && valid.length > 0 ? ots[0] : 0
  } else {
    hours = hasRental && input.start_time && input.end_time ? calcHours(input.start_time, input.end_time) : null
    overtimePerDay = hours === null ? 0 : overtimeOf(hours)
    overtimeTotal = overtimePerDay * days
    billable = billableHours(overtimePerDay) * days
  }
  const overtimeFee = billable * ratePerHour
  const overtimeUnpriced = overtimeTotal > 0 && rental.some((l) => l.capacity_kva !== null && l.overtime_rate === null)

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
    overtimeHoursTotal: overtimeTotal,
    hoursVary,
    overtimeFee, overtimeUnpriced,
    shippingFee, shippingPending,
    total: itemsTotal + (shippingFee ?? 0) + overtimeFee,
  }
}
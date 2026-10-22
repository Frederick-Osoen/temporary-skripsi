// Cermin v_std di SQL set_order_schedule. Jika dosen minta ganti batas jam, ubah DI KEDUA tempat.
export const STANDARD_HOURS = 8

export type ScheduleRow = {
  schedule_date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  operating_hours: number
  overtime_hours: number
}

import { addDays } from './utils'

export function eachDay(start: string, end: string, max = 90): string[] {
  const out: string[] = []
  for (let d = start; d <= end && out.length < max; d = addDays(d, 1)) out.push(d)
  return out
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Selesai <= mulai berarti melewati tengah malam. Mengembalikan null jika jam tidak valid.
export function calcHours(start: string, end: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null
  const s = toMinutes(start)
  const e = toMinutes(end)
  if (s === e) return null
  const diff = e > s ? e - s : e - s + 1440
  return Math.round((diff / 60) * 100) / 100
}

export const overtimeOf = (hours: number) => Math.max(0, Math.round((hours - STANDARD_HOURS) * 100) / 100)

// Cermin CEIL() di SQL: overtime ditagih per jam yang dimulai
export const billableHours = (overtime: number) => Math.ceil(overtime - 1e-9)

export const calcOvertimeFee = (overtimePerDay: number[], ratePerHour: number) =>
  overtimePerDay.reduce((s, o) => s + billableHours(o), 0) * ratePerHour
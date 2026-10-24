import { NextResponse } from 'next/server'
import { runDailyJob } from '@/lib/cron/daily'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Dipanggil terjadwal setiap pagi (vercel.json). Dilindungi CRON_SECRET.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const res = await runDailyJob()
  return NextResponse.json(res, { status: res.ok ? 200 : 500 })
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Supabase gratis menjeda proyek yang tidak aktif 7 hari. Endpoint ini dipanggil terjadwal
// (vercel.json) dan melakukan satu kueri ringan. Dilindungi CRON_SECRET (Vercel mengirimnya otomatis).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const { error } = await createAdminClient().from('store_settings').select('id').eq('id', 1).maybeSingle()
  if (error) {
    console.error('[keepalive]', error.message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() })
}

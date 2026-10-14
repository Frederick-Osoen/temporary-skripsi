import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  return xff?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

// Mengembalikan 0 jika diizinkan, atau sisa detik tunggu jika diblokir.
export async function checkRateLimit(
  supabase: SupabaseClient,
  bucket: string,
  ip: string,
  limit: number,
  windowSeconds: number
): Promise<number> {
  // IP di-hash agar tidak tersimpan mentah di database
  const hashed = createHash('sha256').update(ip).digest('hex').slice(0, 32)
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: `${bucket}:${hashed}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    // Fail-open: gangguan pada limiter tidak boleh mematikan fitur estimasi
    console.error('[rate-limit] gagal:', error)
    return 0
  }
  return Number(data ?? 0)
}
export type DbErr = { code?: string | null; message?: string | null; details?: string | null } | null | undefined

// Gangguan jaringan/timeout ke Supabase (bukan kesalahan data)
export function isNetworkError(e: DbErr): boolean {
  if (!e) return false
  const text = `${e.message ?? ''} ${e.details ?? ''}`.toLowerCase()
  return /fetch failed|network|timeout|timed out|econnreset|etimedout|enotfound|socket|und_err|bad gateway|gateway|service unavailable/.test(text)
}

// Ulangi query idempoten yang gagal karena jaringan
export async function retryTransient<T extends { error: DbErr }>(fn: () => PromiseLike<T>, attempts = 2): Promise<T> {
  let res = await fn()
  for (let i = 1; i < attempts && res.error && isNetworkError(res.error); i++) {
    await new Promise((r) => setTimeout(r, 300 * i))
    res = await fn()
  }
  return res
}
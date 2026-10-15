export type ActionCode = 'CONFLICT' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'UNAVAILABLE'
export type ActionFail = { ok: false; error: string; code?: ActionCode }
export type ActionResult = { ok: true } | ActionFail
export type ActionData<T> = { ok: true; data: T } | ActionFail

// Bungkus SETIAP pemanggilan Server Action dari Client Component.
export async function safeAction<T extends { ok: boolean }>(fn: () => Promise<T>): Promise<T | ActionFail> {
  try {
    const res = await fn()
    if (!res.ok && (res as unknown as ActionFail).code === 'UNAUTHENTICATED') {
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.assign(`/login?expired=1&next=${next}`)
    }
    return res
  } catch (err) {
    console.error('[safeAction] panggilan server gagal:', err)
    return {
      ok: false,
      code: 'UNAVAILABLE',
      error: 'Koneksi ke server bermasalah atau aplikasi baru diperbarui. Muat ulang halaman lalu coba lagi.',
    }
  }
}
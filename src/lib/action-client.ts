export type ActionCode = 'CONFLICT' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'UNAVAILABLE'
export type ActionResult = { ok: true } | { ok: false; error: string; code?: ActionCode }

// Bungkus SETIAP pemanggilan Server Action dari Client Component.
// - sesi habis  -> arahkan ke /login (tanpa crash)
// - respons tak terduga / jaringan -> pesan biasa (tanpa crash)
export async function safeAction(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    const res = await fn()
    if (!res.ok && res.code === 'UNAUTHENTICATED') {
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
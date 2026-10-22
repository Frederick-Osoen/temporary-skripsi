import { Agent, fetch as undiciFetch } from "undici"

// Fetch tahan gangguan untuk semua pemanggilan server -> Supabase.
const RETRYABLE_RPC =
  /\/rest\/v1\/rpc\/(create_order|record_payment|change_order_status|update_order|edit_payment|delete_payment|set_order_allocation|set_order_schedule|extend_order|check_rate_limit)(\?|$)/

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Satu agent untuk seluruh proses (HMR dev tidak membuat agent baru)
const g = globalThis as unknown as { __jjAgent?: Agent }
const agent = (g.__jjAgent ??= new Agent({
  keepAliveTimeout: 2_000,     // soket menganggur dibuang setelah 2 dtk
  keepAliveMaxTimeout: 4_000,  // batas atas, walau server minta lebih lama
  connect: { timeout: 10_000 },
}))


function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function canRetry(method: string, url: string) {
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') return true
  return method === 'POST' && RETRYABLE_RPC.test(url)
}

// Gagal jaringan di Node/undici dilempar sebagai TypeError('fetch failed').
// Pembatalan (AbortError/TimeoutError) adalah DOMException, jadi tidak ikut diulang.
const isNetworkFailure = (err: unknown) => err instanceof TypeError

export async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const attempts = canRetry(method, requestUrl(input)) ? 4 : 1

  for (let i = 1; ; i++) {
    try {
      return (await undiciFetch(input as never, { ...init, dispatcher: agent } as never)) as unknown as Response
    } catch (err) {
      if (!isNetworkFailure(err) || i >= attempts) throw err
      const code = (err as { cause?: { code?: string } }).cause?.code ?? 'unknown'
      console.warn(`[fetch] ${method} gagal (${code}), ulang ${i}/${attempts - 1}`)
      await sleep(100 * i)
    }
  }
}
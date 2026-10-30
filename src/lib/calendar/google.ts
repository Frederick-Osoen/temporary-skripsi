import { createSign } from 'node:crypto'

// Klien Google Calendar minimal dengan service account (tanpa library googleapis).
// Env: GOOGLE_CALENDAR_CLIENT_EMAIL, GOOGLE_CALENDAR_PRIVATE_KEY (baris baru ditulis \n), GOOGLE_CALENDAR_ID
// (nama lama GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY tetap dikenali)
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://www.googleapis.com/calendar/v3/calendars'

const clientEmail = () => process.env.GOOGLE_CALENDAR_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const privateKey = () => process.env.GOOGLE_CALENDAR_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY

export const calendarConfigured = () => !!(clientEmail() && privateKey() && process.env.GOOGLE_CALENDAR_ID)

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url')

let cached: { token: string; exp: number } | null = null

async function accessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token
  const email = clientEmail()!
  const key = privateKey()!.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }))}`
  const sig = createSign('RSA-SHA256').update(unsigned).sign(key)
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(sig)}` }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`token Google ditolak (${res.status}): ${(await res.text()).slice(0, 200)}`)
  const j = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 }
  return j.access_token
}

export type CalEvent = {
  summary: string
  description: string
  date: string // YYYY-MM-DD (hari pertama)
  endDate?: string // YYYY-MM-DD, hari terakhir (inklusif); kosong = acara sehari penuh
  colorId: string
  orderId: string
}

const body = (e: CalEvent) => {
  const next = new Date((e.endDate ?? e.date) + 'T00:00:00Z')
  next.setUTCDate(next.getUTCDate() + 1)
  return {
    summary: e.summary,
    description: e.description,
    start: { date: e.date },
    end: { date: next.toISOString().slice(0, 10) }, // akhir eksklusif
    colorId: e.colorId,
    extendedProperties: { private: { jjOrderId: e.orderId } },
  }
}

async function call(method: string, path: string, payload?: unknown): Promise<Response> {
  const cal = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!)
  return fetch(`${API}/${cal}/events${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(10_000),
  })
}

async function fail(res: Response, what: string): Promise<never> {
  const t = await res.text().catch(() => '')
  const hint = res.status === 404 ? ' (kalender belum dibagikan ke service account, atau GOOGLE_CALENDAR_ID salah)' : res.status === 403 ? ' (izin kalender kurang: pilih "Make changes to events")' : ''
  throw new Error(`${what} gagal ${res.status}${hint}: ${t.slice(0, 200)}`)
}

export async function createEvent(e: CalEvent): Promise<string> {
  const res = await call('POST', '', body(e))
  if (!res.ok) await fail(res, 'buat event')
  return ((await res.json()) as { id: string }).id
}

// Mengembalikan id baru bila event lama sudah dihapus manual di Google Calendar.
export async function updateEvent(eventId: string, e: CalEvent): Promise<string> {
  const res = await call('PUT', `/${encodeURIComponent(eventId)}`, body(e))
  if (res.status === 404 || res.status === 410) return createEvent(e)
  if (!res.ok) await fail(res, 'ubah event')
  return eventId
}

export async function deleteEvent(eventId: string): Promise<void> {
  const res = await call('DELETE', `/${encodeURIComponent(eventId)}`)
  if (!res.ok && res.status !== 404 && res.status !== 410) await fail(res, 'hapus event')
}

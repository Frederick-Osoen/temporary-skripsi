export type LeadPayload = {
  customer_name?: string
  total_estimate: number
  payload: {
    items: { product_id: string; name: string; qty: number; category: 'rental' | 'sales' }[]
    start_date: string
    end_date: string
    start_time: string | null
    end_time: string | null
    delivery: 'delivery' | 'store_pickup'
    destination: string | null
    fleet: string | null
    fleet_pickups: number
    fleet_trucks: number
    distance_km: number | null
    shipping_pending: boolean
    notes: string[]
  }
  website?: string // honeypot, selalu kosong dari UI sungguhan
}

const LAST_KEY = 'jj_last_lead'

// Fire-and-forget: tidak boleh menghambat pembukaan WhatsApp, dan error-nya tidak ditampilkan ke pelanggan.
export function sendLead(data: LeadPayload) {
  try {
    const body = JSON.stringify(data)
    // Klik berulang dengan isi yang sama (mis. tombol ditekan dua kali) tidak membuat lead ganda
    if (sessionStorage.getItem(LAST_KEY) === body) return
    sessionStorage.setItem(LAST_KEY, body)
    void fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true, // tetap terkirim walau tab berpindah ke WhatsApp
    }).catch(() => {})
  } catch {
    // sessionStorage/fetch tidak tersedia: abaikan
  }
}

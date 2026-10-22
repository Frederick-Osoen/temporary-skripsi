import { createClient } from '@/lib/supabase/server'
import { LeadsList, type Lead } from '@/components/dashboard/leads/leads-list'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('id, created_at, customer_name, payload, total_estimate, status, converted_order_id')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return <p className="text-sm text-destructive">Gagal memuat leads: {error.message}</p>

  const leads: Lead[] = (data ?? []).map((l) => ({
    id: l.id,
    created_at: l.created_at,
    customer_name: l.customer_name,
    payload: l.payload ?? null,
    total_estimate: Number(l.total_estimate ?? 0),
    status: l.status,
    converted_order_id: l.converted_order_id ?? null,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Calon pelanggan yang menekan &quot;Lanjutkan via WhatsApp&quot; di halaman estimasi (200 terbaru).
          Pelanggan akan menghubungi lewat WhatsApp, lalu Anda buat pesanannya di menu Pesanan.
        </p>
      </div>
      <LeadsList leads={leads} />
    </div>
  )
}

import { Search } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AutoRefresh } from '@/components/dashboard/auto-refresh'
import { LeadsList } from '@/components/dashboard/leads/leads-list'
import type { LeadRow } from '@/lib/leads'

export const dynamic = 'force-dynamic'

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: qRaw } = await searchParams
  // Buang karakter yang bermakna di filter PostgREST / pola LIKE
  const q = (qRaw ?? '').replace(/[%_,()*\\]/g, ' ').trim().slice(0, 40)

  const supabase = await createClient()
  let query = supabase
    .from('leads')
    .select('id, created_at, customer_name, payload, total_estimate, status, converted_order_id, ref_code, seriousness, auto_archived_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (q) query = query.or(`ref_code.ilike.%${q}%,customer_name.ilike.%${q}%`)
  const { data, error } = await query

  if (error) return <p className="text-sm text-destructive">Gagal memuat leads: {error.message}</p>

  const leads: LeadRow[] = (data ?? []).map((l) => ({
    id: l.id,
    created_at: l.created_at,
    customer_name: l.customer_name,
    payload: l.payload ?? null,
    total_estimate: Number(l.total_estimate ?? 0),
    status: l.status,
    converted_order_id: l.converted_order_id ?? null,
    ref_code: l.ref_code ?? null,
    seriousness: l.seriousness ?? null,
    auto_archived_at: l.auto_archived_at ?? null,
  }))

  return (
    <div className="space-y-4">
      <AutoRefresh seconds={30} />
      <div>
        <h1 className="text-xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Calon pelanggan yang menekan &quot;Lanjutkan via WhatsApp&quot; di halaman estimasi (200 terbaru).
          Setiap lead punya kode referensi yang juga tertulis di pesan WhatsApp-nya: cari kodenya untuk mencocokkan chat yang masuk.
          Lead &quot;Baru&quot; yang tidak ditindaklanjuti 7 hari diarsipkan otomatis.
        </p>
      </div>

      <form method="get" role="search" className="flex gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari kode (JJ-4K7P2) atau nama"
            aria-label="Cari lead"
            autoCapitalize="characters"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button type="submit" className="h-9 rounded-md border border-input bg-background px-3 text-sm hover:bg-muted">Cari</button>
        {q && <Link href="/dashboard/leads" className="inline-flex h-9 items-center px-2 text-sm text-primary hover:underline">Hapus pencarian</Link>}
      </form>

      <LeadsList leads={leads} searching={!!q} />
    </div>
  )
}

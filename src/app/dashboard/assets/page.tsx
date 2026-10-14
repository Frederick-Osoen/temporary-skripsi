import { createClient } from '@/lib/supabase/server'
import { AssetsTable } from '@/components/dashboard/assets/assets-table'
import { evaluateMaintenance, isAcProduct } from '@/lib/maintenance'
import type { AssetRow, MaintenanceHistoryItem, ProductOption } from '@/lib/validations/asset'

type Raw = {
  id: string
  product_id: string
  asset_code: string
  initial_count: number
  rental_count: number
  status: AssetRow['status']
  version: number
  products: { name: string } | { name: string }[] | null
  updated_at: string,
  maintenance_logs: (MaintenanceHistoryItem & { created_at: string })[] | null
}

export default async function AssetsPage() {
  const supabase = await createClient()

  const [assetsRes, productsRes] = await Promise.all([
    supabase
      .from('unit_assets')
      .select(
        // UBAH: ambil kolom log lengkap untuk riwayat
        'id, product_id, asset_code, initial_count, rental_count, status, version, updated_at, products(name), maintenance_logs(id, type, service_date, description, rental_count_at_service, created_at)'
      )
      .order('updated_at', {ascending: false})
      .order('asset_code'),
    supabase.from('products').select('id, name').eq('category', 'rental').order('name'),
  ])

  if (assetsRes.error || productsRes.error) {
    return <p className="text-sm text-destructive">Gagal memuat aset: {(assetsRes.error ?? productsRes.error)?.message}</p>
  }

  const assets: AssetRow[] = (assetsRes.data as unknown as Raw[]).map((r) => {
    const product = Array.isArray(r.products) ? r.products[0] : r.products
    const name = product?.name ?? '-'
    const rawLogs = r.maintenance_logs ?? []

    // Terbaru di atas
    const logs: MaintenanceHistoryItem[] = [...rawLogs]
      .sort((a, b) => b.service_date.localeCompare(a.service_date) || b.created_at.localeCompare(a.created_at))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ created_at: _c, ...rest }) => rest)

    return {
      id: r.id,
      product_id: r.product_id,
      product_name: name,
      asset_code: r.asset_code,
      initial_count: r.initial_count,
      rental_count: r.rental_count,
      total_count: r.initial_count + r.rental_count,
      status: r.status,
      version: r.version,
      updated_at: r.updated_at,
      // UBAH: kirim initial_count dan rental_count terpisah
      alert: isAcProduct(name) ? evaluateMaintenance(r.initial_count, r.rental_count, logs) : null,
      logs,
    }
  })

  const products: ProductOption[] = productsRes.data ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Aset Fisik</h1>
        <p className="text-sm text-muted-foreground">Kelola unit fisik, status, dan peringatan perawatan.</p>
      </div>
      <AssetsTable assets={assets} products={products} />
    </div>
  )
}
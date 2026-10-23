import { getCurrentAdmin } from '@/lib/auth'
import { AuthProblem } from '@/components/dashboard/auth-problem'
import { SettingsForm } from '@/components/dashboard/settings/settings-form'
import { DEFAULT_SETTINGS, type StoreSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const admin = await getCurrentAdmin()
  if (!admin.ok) return <AuthProblem code={admin.code} message={admin.error} />

  const { data, error } = await admin.supabase
    .from('store_settings')
    .select('wa_number, fuel_rate_pickup, fuel_rate_truck')
    .eq('id', 1)
    .maybeSingle()

  const missing = !!error || !data
  const initial: StoreSettings = data
    ? { wa_number: String(data.wa_number), fuel_rate_pickup: Number(data.fuel_rate_pickup), fuel_rate_truck: Number(data.fuel_rate_truck) }
    : DEFAULT_SETTINGS

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pengaturan Toko</h1>
        <p className="text-sm text-muted-foreground">Nomor WhatsApp dan tarif BBM per km.</p>
      </div>
      {missing && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tabel pengaturan belum ada. Jalankan <code>fase-6e2.sql</code> di Supabase terlebih dahulu.
        </p>
      )}
      <SettingsForm initial={initial} canEdit={!missing && admin.role === 'owner'} />
    </div>
  )
}

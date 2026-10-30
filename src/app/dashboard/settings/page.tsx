import { getCurrentAdmin } from '@/lib/auth'
import { AuthProblem } from '@/components/dashboard/auth-problem'
import { SettingsForm } from '@/components/dashboard/settings/settings-form'
import { NotifyTester } from '@/components/dashboard/settings/notify-tester'
import { GensetRulesEditor } from '@/components/dashboard/settings/genset-rules-editor'
import type { GensetRule } from '@/lib/public/genset'
import { getNotifyStatus } from './notify-actions'
import { rowToSettings } from '@/lib/settings'
import { opsSource } from '@/lib/notify/recipients'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const admin = await getCurrentAdmin()
  if (!admin.ok) return <AuthProblem code={admin.code} message={admin.error} />

  const { data, error } = await admin.supabase.from('store_settings').select('*').eq('id', 1).maybeSingle()

  const missing = !!error || !data
  const initial = rowToSettings(data)
  // Kolom dari fase-9d.sql belum ada: kartu baru dikunci dan owner diberi tahu
  const needs9d = !missing && !('instagram_url' in (data as object))
  const source = await opsSource()
  const { data: ruleRows } = await admin.supabase.from('genset_rules').select('min_ac, max_ac, kva').order('min_ac')
  const rules: GensetRule[] = (ruleRows ?? []).map((x) => ({ min_ac: x.min_ac, max_ac: x.max_ac, kva: x.kva }))

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">Kontak, sosmed, jam buka toko, tarif BBM, aturan genset, dan penerima email.</p>
      </div>
      {missing && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tabel pengaturan belum ada. Jalankan <code>fase-6e2.sql</code> di Supabase terlebih dahulu.
        </p>
      )}
      {needs9d && (
        <p role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Telepon, jam buka, penerima email, email kontak, dan sosmed butuh kolom baru. Jalankan <code>fase-9d.sql</code> lalu <code>fase-9e.sql</code> di Supabase, lalu muat ulang halaman ini.
        </p>
      )}
      <SettingsForm initial={initial} canEdit={!missing && admin.role === 'owner'} extendedReady={!needs9d} emailSource={source} />
      <GensetRulesEditor initial={rules} canEdit={!missing && admin.role === 'owner'} ready />
      {admin.role === 'owner' && <NotifyTester status={await getNotifyStatus()} />}
    </div>
  )
}

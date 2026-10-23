import type { Metadata } from 'next'
import { getCurrentAdmin } from '@/lib/auth'
import { signOut } from '@/app/auth/actions'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthProblem } from '@/components/dashboard/auth-problem'

// Area admin tidak boleh diindeks mesin pencari
export const metadata: Metadata = { title: { default: 'Dashboard', template: '%s | Dashboard JJ Teknik' }, robots: { index: false, follow: false } }

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin()

  if (!admin.ok) {
    if (admin.code === 'FORBIDDEN') {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-lg font-semibold">Akses ditolak</h1>
          <p className="text-sm text-muted-foreground">Akun ini tidak terdaftar sebagai admin.</p>
          <form action={signOut}>
            <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">Keluar</button>
          </form>
        </main>
      )
    }
    return <AuthProblem code={admin.code} message={admin.error} fullScreen />
  }

  // Jumlah lead baru untuk badge menu. Gagal menghitung tidak boleh menghalangi dashboard.
  let newLeads = 0
  try {
    const { count } = await admin.supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new')
    newLeads = count ?? 0
  } catch {
    newLeads = 0
  }

  return (
    <DashboardShell name={admin.name} role={admin.role} newLeads={newLeads} signOutAction={signOut}>
      {children}
    </DashboardShell>
  )
}
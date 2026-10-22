import { getCurrentAdmin } from '@/lib/auth'
import { signOut } from '@/app/auth/actions'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { AuthProblem } from '@/components/dashboard/auth-problem'

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

  return (
    <DashboardShell name={admin.name} role={admin.role} signOutAction={signOut}>
      {children}
    </DashboardShell>
  )
}
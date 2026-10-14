import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { isTransientAuthError } from '@/lib/supabase/auth-utils'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user) {
    if (isTransientAuthError(userError)) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-lg font-semibold">Koneksi bermasalah</h1>
          <p className="text-sm text-muted-foreground">Tidak dapat menghubungi server autentikasi.</p>
          <a href="/dashboard" className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">Muat ulang</a>
        </main>
      )
    }
    redirect('/login')
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!admin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-lg font-semibold">Akses ditolak</h1>
        <p className="text-sm text-muted-foreground">
          Akun ini tidak terdaftar sebagai admin.
        </p>
        <form action={signOut}>
          <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">
            Keluar
          </button>
        </form>
      </main>
    )
  }

  return (
    <DashboardShell name={admin.name} role={admin.role} signOutAction={signOut}>
      {children}
    </DashboardShell>
  )
}
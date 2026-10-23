import { getCurrentAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthProblem } from '@/components/dashboard/auth-problem'
import { AdminManager, type AdminItem } from '@/components/dashboard/admins/admin-manager'

export const dynamic = 'force-dynamic'

export default async function AdminsPage() {
  const me = await getCurrentAdmin()
  if (!me.ok) return <AuthProblem code={me.code} message={me.error} />
  if (me.role !== 'owner') return <p className="text-sm text-muted-foreground">Halaman ini khusus owner.</p>

  const db = createAdminClient()
  const [{ data: admins, error }, users] = await Promise.all([
    db.from('admins').select('id, name, role').order('role', { ascending: false }).order('name'),
    db.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ])
  if (error) return <p className="text-sm text-destructive">Gagal memuat admin: {error.message}</p>

  const byId = new Map((users.data?.users ?? []).map((u) => [u.id, u]))
  const items: AdminItem[] = (admins ?? []).map((a) => {
    const u = byId.get(a.id)
    const banned = !!u?.banned_until && new Date(u.banned_until) > new Date()
    return { id: a.id, name: a.name as string, role: a.role as 'owner' | 'admin', email: u?.email ?? '-', active: !banned, isMe: a.id === me.userId }
  })

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Kelola Admin</h1>
        <p className="text-sm text-muted-foreground">Tambah, nonaktifkan, atau reset kata sandi admin. Khusus owner.</p>
      </div>
      <AdminManager items={items} />
    </div>
  )
}

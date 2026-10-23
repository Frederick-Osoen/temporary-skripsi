'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Plus, Trash2, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createAdmin, deleteAdmin, resetAdminPassword, setAdminActive } from '@/app/dashboard/admins/actions'
import { safeAction } from '@/lib/action-client'

export type AdminItem = { id: string; name: string; role: 'owner' | 'admin'; email: string; active: boolean; isMe: boolean }

const field =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AdminManager({ items }: { items: AdminItem[] }) {
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [resetting, setResetting] = useState<AdminItem | null>(null)
  const [newPw, setNewPw] = useState('')
  const [deleting, setDeleting] = useState<AdminItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function done(res: { ok: boolean } & { error?: string }, after?: () => void, ok?: string) {
    if (res.ok) {
      after?.()
      setError(null)
      if (ok) setNotice(ok)
    } else setError(res.error ?? 'Gagal.')
  }

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    start(async () => done(await safeAction(() => createAdmin(form)), () => { setAdding(false); setForm({ name: '', email: '', password: '' }) }, 'Admin ditambahkan. Berikan email dan kata sandinya secara langsung.'))
  }
  const toggle = (a: AdminItem) => {
    setError(null); setNotice(null)
    start(async () => done(await safeAction(() => setAdminActive(a.id, !a.active)), undefined, a.active ? `${a.name} dinonaktifkan. Sesi yang sedang berjalan berakhir dalam beberapa menit.` : `${a.name} diaktifkan kembali.`))
  }
  const reset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetting) return
    setError(null)
    start(async () => done(await safeAction(() => resetAdminPassword(resetting.id, newPw)), () => { setResetting(null); setNewPw('') }, 'Kata sandi diganti.'))
  }
  const remove = () => {
    if (!deleting) return
    start(async () => {
      const res = await safeAction(() => deleteAdmin(deleting.id))
      done(res, () => setDeleting(null), 'Admin dihapus.')
      if (!res.ok) setDeleting(null)
    })
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => { setError(null); setNotice(null); setAdding(true) }}><Plus className="mr-1.5 h-4 w-4" /> Tambah admin</Button>
      {notice && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</p>}
      {error && !adding && !resetting && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <ul className="divide-y rounded-xl border bg-background">
        {items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.name}{a.isMe && <span className="font-normal text-muted-foreground"> (Anda)</span>}</p>
              <p className="truncate text-xs text-muted-foreground">{a.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={a.role === 'owner' ? 'default' : 'secondary'}>{a.role === 'owner' ? 'Owner' : 'Admin'}</Badge>
              {!a.active && <Badge variant="destructive">Nonaktif</Badge>}
            </div>
            {a.role === 'admin' && !a.isMe && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => toggle(a)}>
                  {a.active ? <UserX className="mr-1.5 h-3.5 w-3.5" /> : <UserCheck className="mr-1.5 h-3.5 w-3.5" />}
                  {a.active ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setError(null); setNewPw(''); setResetting(a) }}><KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset sandi</Button>
                <Button size="sm" variant="ghost" onClick={() => { setNotice(null); setDeleting(a) }} aria-label={`Hapus ${a.name}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah admin</DialogTitle>
            <DialogDescription>Akun langsung aktif. Berikan email dan kata sandi ini kepada orangnya, lalu minta ia menggantinya.</DialogDescription>
          </DialogHeader>
          <form onSubmit={add} className="space-y-4">
            <div className="space-y-1.5"><label htmlFor="a-name" className="text-sm font-medium">Nama</label>
              <input id="a-name" className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><label htmlFor="a-mail" className="text-sm font-medium">Email</label>
              <input id="a-mail" type="email" className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><label htmlFor="a-pw" className="text-sm font-medium">Kata sandi awal</label>
              <input id="a-pw" type="text" autoComplete="off" className={field} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Tambah'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset kata sandi {resetting?.name}</DialogTitle>
            <DialogDescription>Kata sandi lama langsung tidak berlaku.</DialogDescription>
          </DialogHeader>
          <form onSubmit={reset} className="space-y-4">
            <input aria-label="Kata sandi baru" type="text" autoComplete="off" className={field} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Ganti'}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Akun dihapus permanen. Bila admin ini sudah punya riwayat pesanan, penghapusan ditolak dan sebaiknya dinonaktifkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="destructive" disabled={pending} onClick={remove}>Hapus</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ImageUploader } from '@/components/dashboard/products/image-uploader'
import { deleteTestimonial, saveTestimonial, setTestimonialPublished } from '@/app/dashboard/testimonials/actions'
import { safeAction } from '@/lib/action-client'
import { EVENT_LABEL, EVENT_TYPES, type TestimonialRow } from '@/lib/validations/content'

const field =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Draft = { name: string; role: string; quote: string; image_path: string | null; event_type: string; consent: boolean; is_published: boolean }
const blank: Draft = { name: '', role: '', quote: '', image_path: null, event_type: '', consent: false, is_published: false }

export function TestimonialManager({ items }: { items: TestimonialRow[] }) {
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const [deleting, setDeleting] = useState<TestimonialRow | null>(null)
  const [busyUpload, setBusyUpload] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const open = (row?: TestimonialRow) => {
    setError(null)
    setEditing(
      row
        ? { id: row.id, draft: { name: row.name, role: row.role ?? '', quote: row.quote, image_path: row.image_path, event_type: row.event_type ?? '', consent: row.consent, is_published: row.is_published } }
        : { id: null, draft: blank }
    )
  }
  const patch = (p: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...p } } : e))

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError(null)
    start(async () => {
      const d = editing.draft
      const res = await safeAction(() => saveTestimonial(editing.id, { ...d, event_type: d.event_type || null }))
      if (res.ok) setEditing(null)
      else setError(res.error)
    })
  }

  function toggle(row: TestimonialRow) {
    setError(null)
    start(async () => {
      const res = await safeAction(() => setTestimonialPublished(row.id, !row.is_published))
      if (!res.ok) setError(res.error)
    })
  }

  function remove() {
    if (!deleting) return
    start(async () => {
      const res = await safeAction(() => deleteTestimonial(deleting.id))
      if (res.ok) setDeleting(null)
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => open()}><Plus className="mr-1.5 h-4 w-4" /> Tambah testimoni</Button>
      {error && !editing && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada testimoni. Hanya masukkan ucapan nyata dari pelanggan yang sudah mengizinkan.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((t) => (
            <li key={t.id} className="space-y-2 rounded-xl border bg-background p-4">
              <p className="text-sm leading-relaxed">“{t.quote}”</p>
              <p className="text-sm font-medium">{t.name}{t.role ? <span className="font-normal text-muted-foreground">, {t.role}</span> : null}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {t.event_type && <Badge variant="outline">{EVENT_LABEL[t.event_type]}</Badge>}
                <Badge variant={t.is_published ? 'default' : 'secondary'}>{t.is_published ? 'Tayang' : 'Draf'}</Badge>
                {!t.consent && <Badge variant="destructive">Belum ada izin</Badge>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => toggle(t)}>
                  {t.is_published ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                  {t.is_published ? 'Sembunyikan' : 'Tayangkan'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => open(t)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(t)} aria-label={`Hapus testimoni ${t.name}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit testimoni' : 'Tambah testimoni'}</DialogTitle>
            <DialogDescription>Salin ucapan asli pelanggan. Jangan mengarang atau memperhalus sampai maknanya berubah.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="t-quote" className="text-sm font-medium">Kutipan</label>
                <textarea id="t-quote" rows={4} maxLength={600} className={`${field} h-auto py-2`} value={editing.draft.quote} onChange={(e) => patch({ quote: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="t-name" className="text-sm font-medium">Nama</label>
                  <input id="t-name" className={field} maxLength={80} value={editing.draft.name} onChange={(e) => patch({ name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="t-role" className="text-sm font-medium">Peran / asal (opsional)</label>
                  <input id="t-role" className={field} maxLength={80} value={editing.draft.role} onChange={(e) => patch({ role: e.target.value })} placeholder="Event Organizer, Surabaya" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="t-type" className="text-sm font-medium">Jenis acara (opsional)</label>
                <select id="t-type" className={field} value={editing.draft.event_type} onChange={(e) => patch({ event_type: e.target.value })}>
                  <option value="">-</option>
                  {EVENT_TYPES.map((x) => <option key={x} value={x}>{EVENT_LABEL[x]}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Tangkapan layar chat (opsional)</span>
                <ImageUploader value={editing.draft.image_path} onChange={(p) => patch({ image_path: p })} onBusyChange={setBusyUpload} folder="testimonials" alt="Tangkapan layar testimoni" hint="Sensor nomor telepon sebelum diunggah." />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={editing.draft.consent} onChange={(e) => patch({ consent: e.target.checked, ...(e.target.checked ? {} : { is_published: false }) })} className="mt-0.5 size-4" />
                Pelanggan sudah mengizinkan ucapannya ditampilkan
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.draft.is_published} disabled={!editing.draft.consent} onChange={(e) => patch({ is_published: e.target.checked })} className="size-4" />
                Tayangkan di situs publik
              </label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={pending || busyUpload}>{pending ? 'Menyimpan…' : 'Simpan'}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus testimoni ini?</AlertDialogTitle>
            <AlertDialogDescription>Testimoni hilang permanen. Untuk sekadar menyembunyikan, pilih Sembunyikan.</AlertDialogDescription>
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

'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ImageUploader } from '@/components/dashboard/products/image-uploader'
import { deleteGalleryItem, saveGalleryItem, setGalleryPublished } from '@/app/dashboard/gallery/actions'
import { safeAction } from '@/lib/action-client'
import { productImageUrl } from '@/lib/storage'
import { EVENT_LABEL, EVENT_TYPES, type GalleryRow } from '@/lib/validations/content'

const field =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type Draft = { image_path: string | null; caption: string; event_type: GalleryRow['event_type']; location: string; event_date: string; is_published: boolean }
const blank: Draft = { image_path: null, caption: '', event_type: 'lainnya', location: '', event_date: '', is_published: true }

export function GalleryManager({ items }: { items: GalleryRow[] }) {
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const [deleting, setDeleting] = useState<GalleryRow | null>(null)
  const [busyUpload, setBusyUpload] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const open = (row?: GalleryRow) => {
    setError(null)
    setEditing(
      row
        ? { id: row.id, draft: { image_path: row.image_path, caption: row.caption, event_type: row.event_type, location: row.location ?? '', event_date: row.event_date ?? '', is_published: row.is_published } }
        : { id: null, draft: blank }
    )
  }
  const patch = (p: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...p } } : e))

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError(null)
    start(async () => {
      const res = await safeAction(() => saveGalleryItem(editing.id, { ...editing.draft, image_path: editing.draft.image_path ?? '' }))
      if (res.ok) setEditing(null)
      else setError(res.error)
    })
  }

  function toggle(row: GalleryRow) {
    setError(null)
    start(async () => {
      const res = await safeAction(() => setGalleryPublished(row.id, !row.is_published))
      if (!res.ok) setError(res.error)
    })
  }

  function remove() {
    if (!deleting) return
    start(async () => {
      const res = await safeAction(() => deleteGalleryItem(deleting.id))
      if (res.ok) setDeleting(null)
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => open()}><Plus className="mr-1.5 h-4 w-4" /> Tambah foto</Button>
      {error && !editing && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada foto. Foto yang Anda tayangkan muncul di halaman Galeri dan Beranda.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => (
            <li key={g.id} className="overflow-hidden rounded-xl border bg-background">
              <div className="relative aspect-[4/3] bg-muted">
                <Image src={productImageUrl(g.image_path) ?? ''} alt={g.caption} fill sizes="(min-width:1024px) 30vw, 100vw" className="object-cover" />
              </div>
              <div className="space-y-2 p-3">
                <p className="text-sm font-medium">{g.caption}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{EVENT_LABEL[g.event_type]}</Badge>
                  {g.location && <span>{g.location}</span>}
                  <Badge variant={g.is_published ? 'default' : 'secondary'}>{g.is_published ? 'Tayang' : 'Draf'}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => toggle(g)}>
                    {g.is_published ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
                    {g.is_published ? 'Sembunyikan' : 'Tayangkan'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => open(g)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(g)} aria-label={`Hapus ${g.caption}`}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit foto' : 'Tambah foto'}</DialogTitle>
            <DialogDescription>Foto dari pemasangan nyata. Jangan tampilkan wajah atau plat nomor tanpa izin.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-4">
              <ImageUploader value={editing.draft.image_path} onChange={(p) => patch({ image_path: p })} onBusyChange={setBusyUpload} folder="gallery" alt="Foto galeri" hint="Foto otomatis diperkecil ke WebP." />
              <div className="space-y-1.5">
                <label htmlFor="g-cap" className="text-sm font-medium">Keterangan</label>
                <input id="g-cap" className={field} maxLength={160} value={editing.draft.caption} onChange={(e) => patch({ caption: e.target.value })} placeholder="Contoh: 6 AC standing untuk resepsi di gedung serbaguna" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="g-type" className="text-sm font-medium">Jenis acara</label>
                  <select id="g-type" className={field} value={editing.draft.event_type} onChange={(e) => patch({ event_type: e.target.value as Draft['event_type'] })}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_LABEL[t]}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="g-date" className="text-sm font-medium">Tanggal (opsional)</label>
                  <input id="g-date" type="date" className={field} value={editing.draft.event_date} onChange={(e) => patch({ event_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="g-loc" className="text-sm font-medium">Lokasi (opsional)</label>
                <input id="g-loc" className={field} maxLength={80} value={editing.draft.location} onChange={(e) => patch({ location: e.target.value })} placeholder="Contoh: Sidoarjo" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.draft.is_published} onChange={(e) => patch({ is_published: e.target.checked })} className="size-4" />
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
            <AlertDialogTitle>Hapus foto ini?</AlertDialogTitle>
            <AlertDialogDescription>Foto hilang dari galeri. Untuk sekadar menyembunyikan, pilih Sembunyikan.</AlertDialogDescription>
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

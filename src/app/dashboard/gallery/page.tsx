import { createClient } from '@/lib/supabase/server'
import { GalleryManager } from '@/components/dashboard/content/gallery-manager'
import type { GalleryRow } from '@/lib/validations/content'

export default async function GalleryAdminPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gallery_items')
    .select('id, image_path, caption, event_type, location, event_date, is_published')
    .order('sort_order')
    .order('created_at', { ascending: false })
  if (error) return <p className="text-sm text-destructive">Gagal memuat galeri: {error.message}. Pastikan fase-7a.sql sudah dijalankan.</p>
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Galeri</h1>
        <p className="text-sm text-muted-foreground">Foto pemasangan nyata untuk halaman Galeri dan Beranda.</p>
      </div>
      <GalleryManager items={(data ?? []) as GalleryRow[]} />
    </div>
  )
}

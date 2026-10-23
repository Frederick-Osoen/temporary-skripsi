'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { PRODUCT_IMAGE_BUCKET, productImageUrl } from '@/lib/storage'

const MAX_INPUT_BYTES = 8 * 1024 * 1024 // file asli maks 8 MB (akan dikompres)
const MAX_SIDE = 1000 // sisi terpanjang hasil kompresi (px)

// Perkecil + ubah ke WebP di browser agar hemat bandwidth (membantu skor Lighthouse)
async function compressToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas tidak tersedia')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('kompresi gagal'))), 'image/webp', 0.8)
  )
}

export function ImageUploader({
  value,
  onChange,
  onBusyChange,
}: {
  value: string | null
  onChange: (path: string | null) => void
  onBusyChange?: (busy: boolean) => void // dipakai form untuk menonaktifkan tombol Simpan saat upload
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = productImageUrl(value)

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // izinkan memilih file yang sama lagi
    if (!file) return
    setError(null)

    if (!file.type.startsWith('image/')) return setError('File harus berupa gambar.')
    if (file.size > MAX_INPUT_BYTES) return setError('Ukuran gambar maksimal 8 MB.')

    setBusy(true)
    onBusyChange?.(true)
    try {
      const blob = await compressToWebp(file)
      const path = `products/${crypto.randomUUID()}.webp`
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' })
      if (uploadError) throw uploadError
      onChange(path) // baru tersimpan ke database saat tombol Simpan ditekan
    } catch (err) {
      console.error('[image-uploader]', err)
      setError('Gagal mengunggah foto. Pastikan Anda masih login, lalu coba lagi.')
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
          {url ? (
            <Image src={url} alt="Foto produk" fill sizes="80px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? 'Mengunggah...' : url ? 'Ganti foto' : 'Pilih foto'}
          </Button>
          {url && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onChange(null)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" /> Hapus
            </Button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePick} />
      <p className="text-xs text-muted-foreground">Foto otomatis diperkecil ke WebP. Kosongkan untuk memakai placeholder abu-abu.</p>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

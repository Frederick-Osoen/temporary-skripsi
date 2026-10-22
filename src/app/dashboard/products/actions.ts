'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
// import { createClient } from '@/lib/supabase/server'
import { productSchema } from '@/lib/validations/product'
import { requireAdmin } from '@/lib/auth'
import type { ActionResult as Result } from '@/lib/action-client'
import { retryTransient, isNetworkError } from '@/lib/db-errors'



async function guard(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn()
  } catch (err) {
    console.error('[products] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

// Perubahan produk harus langsung terlihat di dashboard DAN katalog publik (yang di-cache 60 detik)
function revalidatePublicCatalog() {
  revalidatePath('/dashboard/products')
  revalidatePath('/katalog')
  revalidatePath('/estimasi')
  revalidatePath('/')
}

export async function createProduct(input: unknown): Promise<Result> {
  return guard(async () => {
    const parsed = productSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase

    const { error } = await supabase.from('products').insert(parsed.data)
    if (error) {
      console.error('[products] insert:', error)
      return { ok: false, error: 'Gagal menyimpan produk' }
    }
    revalidatePublicCatalog()
    return { ok: true }
  })

}

export async function updateProduct(id: string, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'ID tidak valid' }
    const parsed = productSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase

    const { data, error } = await supabase.from('products').update(parsed.data).eq('id', id).select('id')
    if (error) {
      console.error('[products] update:', error)
      return { ok: false, error: 'Gagal memperbarui produk' }
    }
    if (!data?.length) return { ok: false, error: 'Produk tidak ditemukan' }

    revalidatePublicCatalog()
    return { ok: true }
  })
}

export async function deleteProduct(id: string): Promise<Result> {
  return guard(async () => {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'ID tidak valid' }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase

    // 1) Cek keterkaitan lebih dulu: pesan akurat berdasarkan data, bukan tebakan dari kode error
    const [items, units] = await Promise.all([
      retryTransient(() => supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', id)),
      retryTransient(() => supabase.from('unit_assets').select('id', { count: 'exact', head: true }).eq('product_id', id)),
    ])
    if (items.error || units.error) {
      console.error('[products] cek keterkaitan:', items.error ?? units.error)
      return { ok: false, code: 'UNAVAILABLE', error: 'Gagal memeriksa keterkaitan produk karena koneksi database. Coba lagi.' }
    }
    if ((items.count ?? 0) > 0) {
      return { ok: false, error: `Produk dipakai di ${items.count} baris pesanan, tidak bisa dihapus.` }
    }
    if ((units.count ?? 0) > 0) {
      return { ok: false, error: `Produk masih punya ${units.count} unit fisik. Hapus unit di menu Aset Fisik terlebih dahulu.` }
    }

    // 2) Hapus. Aman diulang: jika percobaan sebelumnya sebenarnya berhasil, hasilnya sukses
    const { data, error } = await retryTransient(() =>
      supabase.from('products').delete().eq('id', id).select('id')
    )
    if (error) {
      console.error('[products] delete:', { code: error.code, message: error.message, details: error.details })
      if (isNetworkError(error)) {
        return { ok: false, code: 'UNAVAILABLE', error: 'Koneksi ke database terputus. Produk mungkin sudah terhapus. Muat ulang halaman untuk memastikan.' }
      }
      if (error.code === '23503') {
        return { ok: false, error: 'Produk masih dirujuk data lain, tidak bisa dihapus.' }
      }
      return { ok: false, error: 'Gagal menghapus produk' }
    }

    if (!data?.length) {
      const { data: still } = await supabase.from('products').select('id').eq('id', id).maybeSingle()
      if (still) return { ok: false, error: 'Produk tidak dapat dihapus (ditolak oleh database).' }
      // sudah tidak ada: dianggap berhasil
    }

    revalidatePublicCatalog()
    return { ok: true }
  })
}

// Sembunyikan/tampilkan produk di katalog publik dengan satu klik (tanpa membuka form)
export async function setProductVisibility(id: string, isPublic: boolean): Promise<Result> {
  return guard(async () => {
    if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'ID tidak valid' }
    if (typeof isPublic !== 'boolean') return { ok: false, error: 'Nilai tidak valid' }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }

    const { data, error } = await ctx.supabase.from('products').update({ is_public: isPublic }).eq('id', id).select('id')
    if (error) {
      console.error('[products] visibility:', error)
      return { ok: false, error: 'Gagal mengubah status tampil' }
    }
    if (!data?.length) return { ok: false, error: 'Produk tidak ditemukan' }

    revalidatePublicCatalog()
    return { ok: true }
  })
}

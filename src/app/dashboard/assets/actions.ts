'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
// import { getAdminContext } from '@/lib/auth'
import { requireAdmin } from '@/lib/auth'
import type { ActionResult as Result } from '@/lib/action-client'
import { assetSchema, assetUpdateSchema, maintenanceSchema } from '@/lib/validations/asset'

// UBAH: tambah code opsional agar UI bisa membedakan konflik
// type Result = { ok: true } | { ok: false; error: string; code?: 'CONFLICT' }

const uuid = z.string().uuid()
const versionSchema = z.number().int().min(1)

// BARU: semua error tak terduga diubah jadi hasil biasa, bukan exception
async function guard(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn()
  } catch (err) {
    console.error('[assets] error tak terduga:', err)
    return { ok: false, error: 'Terjadi kesalahan pada server. Coba lagi.' }
  }
}

async function syncProductStock(supabase: SupabaseClient, productId: string) {
  const { count, error } = await supabase
    .from('unit_assets')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
  if (error || count === null) {
    console.error('[assets] gagal hitung stok:', error)
    return
  }
  const { error: updError } = await supabase.from('products').update({ total_stock: count }).eq('id', productId)
  if (updError) console.error('[assets] gagal sinkron total_stock:', updError)
}

function refresh() {
  revalidatePath('/dashboard/assets')
  revalidatePath('/dashboard/products')
}

export async function createAsset(input: unknown): Promise<Result> {
  return guard(async () => {
    const parsed = assetSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    // const supabase = await getAdminContext()
    // if (!supabase) return { ok: false, error: 'Akses ditolak' }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase

    const { data: product } = await supabase
      .from('products').select('category').eq('id', parsed.data.product_id).maybeSingle()
    if (!product) return { ok: false, error: 'Produk tidak ditemukan' }
    if (product.category !== 'rental') return { ok: false, error: 'Unit fisik hanya untuk produk rental' }

    const { error } = await supabase.from('unit_assets').insert(parsed.data)
    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Kode aset sudah dipakai' }
      console.error('[assets] insert:', error)
      return { ok: false, error: 'Gagal menyimpan unit' }
    }

    await syncProductStock(supabase, parsed.data.product_id)
    refresh()
    return { ok: true }
  })
}

export async function updateAsset(id: string, version: number, input: unknown): Promise<Result> {
  return guard(async () => {
    if (!uuid.safeParse(id).success || !versionSchema.safeParse(version).success) {
      return { ok: false, error: 'Permintaan tidak valid' }
    }
    const parsed = assetUpdateSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase


    // Optimistic locking: update hanya jika version masih sama
    const { data, error } = await supabase
      .from('unit_assets')
      .update({ ...parsed.data, version: version + 1 })
      .eq('id', id)
      .eq('version', version)
      .select('id')

    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Kode aset sudah dipakai' }
      console.error('[assets] update:', error)
      return { ok: false, error: 'Gagal memperbarui unit' }
    }
    if (!data?.length) {
      // UBAH: kode CONFLICT, tanpa revalidatePath (UI yang memicu muat ulang lewat tombol)
      return {
        ok: false,
        code: 'CONFLICT',
        error: 'Data ini sudah diubah pihak lain atau sudah dihapus.',
      }
    }

    refresh()
    return { ok: true }
  })
}

export async function deleteAsset(id: string): Promise<Result> {
  return guard(async () => {
    if (!uuid.safeParse(id).success) return { ok: false, error: 'ID tidak valid' }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase


    const { data: asset } = await supabase.from('unit_assets').select('product_id').eq('id', id).maybeSingle()
    if (!asset) return { ok: false, error: 'Unit tidak ditemukan' }

    const { error } = await supabase.from('unit_assets').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') {
        return { ok: false, error: 'Unit pernah dipakai di pesanan, tidak bisa dihapus. Ubah statusnya menjadi Rusak jika sudah tidak dipakai.' }
      }
      console.error('[assets] delete:', error)
      return { ok: false, error: 'Gagal menghapus unit' }
    }

    await syncProductStock(supabase, asset.product_id)
    refresh()
    return { ok: true }
  })
}

export async function logMaintenance(input: unknown): Promise<Result> {
  return guard(async () => {
    const parsed = maintenanceSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }

    const ctx = await requireAdmin()
    if (!ctx.ok) return { ok: false, error: ctx.error, code: ctx.code }
    const supabase = ctx.supabase


    const { data: asset } = await supabase
      .from('unit_assets').select('initial_count, rental_count').eq('id', parsed.data.unit_asset_id).maybeSingle()
    if (!asset) return { ok: false, error: 'Unit tidak ditemukan' }

    const { error } = await supabase.from('maintenance_logs').insert({
      ...parsed.data,
      rental_count_at_service: asset.initial_count + asset.rental_count,
    })
    if (error) {
      console.error('[assets] log maintenance:', error)
      return { ok: false, error: 'Gagal menyimpan log service' }
    }

    await supabase.from('unit_assets').update({ updated_at: new Date().toISOString() }).eq('id', parsed.data.unit_asset_id)

    revalidatePath('/dashboard/assets')
    return { ok: true }
  })
}
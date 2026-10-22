import { createPublicClient } from '@/lib/supabase/public'
import type { GensetRule } from './genset'
import type { PublicProduct } from './types'

type Row = {
  id: string; name: string; category: 'rental' | 'sales'
  base_price: number | string; overtime_rate: number | string | null
  capacity_kva: number | null; description: string | null; image_path: string | null
}

const rank = (p: PublicProduct) => (p.capacity_kva !== null ? 1 : p.category === 'rental' ? 0 : 2)

export async function getPublicProducts(): Promise<{ products: PublicProduct[]; rules: GensetRule[]; error: string | null }> {
  const supabase = createPublicClient()
  const [p, r] = await Promise.all([
    supabase.from('products').select('id, name, category, base_price, overtime_rate, capacity_kva, description, image_path'),
    supabase.from('genset_rules').select('min_ac, max_ac, kva').order('min_ac'),
  ])
  if (p.error || r.error) return { products: [], rules: [], error: (p.error ?? r.error)?.message ?? 'Gagal memuat data' }

  const products = ((p.data ?? []) as Row[])
    .map<PublicProduct>((x) => ({
      id: x.id, name: x.name, category: x.category,
      base_price: Number(x.base_price),
      overtime_rate: x.overtime_rate === null ? null : Number(x.overtime_rate),
      capacity_kva: x.capacity_kva, description: x.description, image_path: x.image_path,
    }))
    .sort((a, b) => rank(a) - rank(b) || (a.capacity_kva ?? 0) - (b.capacity_kva ?? 0) || a.name.localeCompare(b.name, 'id', { numeric: true }))

  const rules: GensetRule[] = (r.data ?? []).map((x) => ({ min_ac: x.min_ac, max_ac: x.max_ac, kva: x.kva }))
  return { products, rules, error: null }
}
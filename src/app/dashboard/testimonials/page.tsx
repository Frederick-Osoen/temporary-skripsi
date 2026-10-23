import { createClient } from '@/lib/supabase/server'
import { TestimonialManager } from '@/components/dashboard/content/testimonial-manager'
import type { TestimonialRow } from '@/lib/validations/content'

export default async function TestimonialsAdminPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('testimonials')
    .select('id, name, role, quote, image_path, event_type, consent, is_published')
    .order('sort_order')
    .order('created_at', { ascending: false })
  if (error) return <p className="text-sm text-destructive">Gagal memuat testimoni: {error.message}. Pastikan fase-7a.sql sudah dijalankan.</p>
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Testimoni</h1>
        <p className="text-sm text-muted-foreground">Hanya ucapan asli pelanggan yang sudah mengizinkan.</p>
      </div>
      <TestimonialManager items={(data ?? []) as TestimonialRow[]} />
    </div>
  )
}

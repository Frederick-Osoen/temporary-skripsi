import { z } from 'zod'

export const EVENT_TYPES = ['pernikahan', 'korporat', 'pabrik', 'ulang_tahun', 'lainnya'] as const
export const EVENT_LABEL: Record<(typeof EVENT_TYPES)[number], string> = {
  pernikahan: 'Pernikahan',
  korporat: 'Korporat',
  pabrik: 'Pabrik',
  ulang_tahun: 'Ulang tahun',
  lainnya: 'Lainnya',
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))

export const gallerySchema = z.object({
  image_path: z.string().min(1, 'Foto wajib diunggah'),
  caption: z.string().trim().min(1, 'Keterangan wajib diisi').max(160, 'Maksimal 160 karakter'),
  event_type: z.enum(EVENT_TYPES),
  location: optText(80),
  event_date: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Tanggal tidak valid'),
  is_published: z.boolean(),
})
export type GalleryInput = z.infer<typeof gallerySchema>

export const testimonialSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama wajib diisi').max(80, 'Maksimal 80 karakter'),
    role: optText(80),
    quote: z.string().trim().min(1, 'Kutipan wajib diisi').max(600, 'Maksimal 600 karakter'),
    image_path: z.string().optional().nullable().transform((v) => (v ? v : null)),
    event_type: z.enum(EVENT_TYPES).optional().nullable().transform((v) => v ?? null),
    consent: z.boolean(),
    is_published: z.boolean(),
  })
  .refine((v) => !v.is_published || v.consent, {
    message: 'Testimoni baru boleh tayang bila pelanggan sudah mengizinkan',
    path: ['consent'],
  })
export type TestimonialInput = z.infer<typeof testimonialSchema>

export type GalleryRow = { id: string; image_path: string; caption: string; event_type: (typeof EVENT_TYPES)[number]; location: string | null; event_date: string | null; is_published: boolean }
export type TestimonialRow = { id: string; name: string; role: string | null; quote: string; image_path: string | null; event_type: (typeof EVENT_TYPES)[number] | null; consent: boolean; is_published: boolean }

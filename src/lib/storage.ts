// Bucket Supabase Storage untuk foto produk (public read, tulis hanya admin).
export const PRODUCT_IMAGE_BUCKET = 'product-images'

/** Ubah path di kolom products.image_path menjadi URL publik. */
export function productImageUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!path || !base) return null
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${path}`
}

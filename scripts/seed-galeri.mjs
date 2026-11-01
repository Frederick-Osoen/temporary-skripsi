// Memasukkan foto galeri awal (folder scripts/galeri-seed) ke Supabase: unggah ke Storage + isi tabel gallery_items.
// Jalankan dari root project:   node scripts/seed-galeri.mjs --dry   (cek dulu)
//                               node scripts/seed-galeri.mjs         (sungguhan)
// Membaca .env.local (NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY). Aman diulang: keterangan yang sudah ada dilewati.
// PERHATIAN: yang dituju adalah database di .env.local (database yang sama dengan produksi bila .env.local menunjuk ke sana).
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const DRY = process.argv.includes('--dry')
const DIR = new URL('./galeri-seed/', import.meta.url)
const BUCKET = 'product-images'

const env = {}
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak ada di .env.local')
const db = createClient(url, key, { auth: { persistSession: false } })
console.log(`${DRY ? '[DRY RUN] ' : ''}Target: ${new URL(url).host}`)

// CSV sederhana: file,keterangan,jenis_acara_disarankan (tanpa koma di dalam kolom)
const rows = readFileSync(new URL('DAFTAR-KETERANGAN.csv', DIR), 'utf8').trim().split(/\r?\n/).slice(1)
  .map((l) => { const [file, caption, event_type] = l.split(','); return { file: file.trim(), caption: caption.trim(), event_type: (event_type || 'lainnya').trim() } })
const have = new Set(readdirSync(DIR))

const { data: existing, error: exErr } = await db.from('gallery_items').select('caption')
if (exErr) throw exErr
const done = new Set((existing ?? []).map((r) => r.caption))

let n = 0
for (const [i, r] of rows.entries()) {
  if (!have.has(r.file)) { console.log(`- lewati (file tidak ada): ${r.file}`); continue }
  if (done.has(r.caption)) { console.log(`- sudah ada: ${r.caption}`); continue }
  if (DRY) { console.log(`+ akan menambah: ${r.file} -> "${r.caption}" [${r.event_type}]`); n++; continue }
  const webp = await sharp(fileURLToPath(new URL(r.file, DIR))).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
  const path = `gallery/${randomUUID()}.webp`
  const up = await db.storage.from(BUCKET).upload(path, webp, { contentType: 'image/webp', cacheControl: '31536000' })
  if (up.error) { console.error(`x gagal unggah ${r.file}:`, up.error.message); continue }
  const ins = await db.from('gallery_items').insert({ image_path: path, caption: r.caption, event_type: r.event_type, is_published: true, sort_order: i })
  if (ins.error) { console.error(`x gagal simpan ${r.file}:`, ins.error.message); continue }
  console.log(`+ ${r.file}`)
  n++
}
console.log(`${DRY ? 'Akan menambah' : 'Berhasil menambah'} ${n} foto.`)

export const STORE_NAME = 'JJ Teknik'

// Nomor WhatsApp bawaan, dibaca dari .env: NEXT_PUBLIC_WA_PHONE_NUMBER (format 08… atau 62… keduanya boleh).
// Ini HANYA cadangan. Nomor yang dipakai situs adalah yang diatur owner di Dashboard > Pengaturan
// (tersimpan di database), jadi mengganti nomor tidak perlu mengubah kode atau deploy ulang.
const raw = (process.env.NEXT_PUBLIC_WA_PHONE_NUMBER ?? process.env.NEXT_PUBLIC_WA_NUMBER ?? '').replace(/\D/g, '')
export const WA_NUMBER = raw.startsWith('0') ? `62${raw.slice(1)}` : raw.startsWith('8') ? `62${raw}` : raw

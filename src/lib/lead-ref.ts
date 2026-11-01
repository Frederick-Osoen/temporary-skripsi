// Kode referensi lead. Modul kecil tanpa dependensi agar aman dipakai di halaman publik.
/** Kode referensi di pesan WhatsApp: "JJ-" + 5 karakter tanpa yang mudah tertukar (I, L, O, 0, 1). */
export const REF_CODE_RE = /^JJ-[A-HJKMNP-Z2-9]{5}$/
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function makeRefCode(): string {
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)
  return 'JJ-' + Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('')
}


/** Lead berstatus "Baru" yang tidak ditindaklanjuti selama ini diarsipkan otomatis oleh cron harian. */
export const LEAD_AUTO_ARCHIVE_DAYS = 7

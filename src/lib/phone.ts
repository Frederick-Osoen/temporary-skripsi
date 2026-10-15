// Normalisasi ke format 62xxxxxxxxxx. Mengembalikan null jika tidak valid.
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = '62' + d.slice(1)
  else if (d.startsWith('8')) d = '62' + d
  return /^62\d{8,13}$/.test(d) ? d : null
}
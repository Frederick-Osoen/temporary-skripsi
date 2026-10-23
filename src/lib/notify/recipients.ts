// Penerima email dibaca dari env supaya bisa diganti tanpa mengubah kode.
//   OWNER_EMAIL    : penerima audit (batal / buka kunci / ubah pembayaran)
//   NOTIFY_EMAILS  : penerima notifikasi operasional (lead baru, ringkasan harian, kegagalan); pisahkan dengan koma
const list = (v: string | undefined) =>
  (v ?? '').split(',').map((s) => s.trim()).filter((s) => /^\S+@\S+\.\S+$/.test(s))

export const ownerRecipients = () => list(process.env.OWNER_EMAIL)

export const opsRecipients = () => {
  const all = [...list(process.env.NOTIFY_EMAILS), ...ownerRecipients()]
  return Array.from(new Set(all))
}

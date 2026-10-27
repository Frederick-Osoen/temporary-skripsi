'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { saveSettings } from '@/app/dashboard/settings/actions'
import { safeAction } from '@/lib/action-client'
import type { StoreSettings } from '@/lib/settings'

const input =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'
const area =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-6">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export function SettingsForm({
  initial, canEdit, extendedReady, emailSource,
}: {
  initial: StoreSettings
  canEdit: boolean
  extendedReady: boolean
  emailSource: 'dashboard' | 'env' | 'none'
}) {
  const [wa, setWa] = useState(initial.wa_number)
  const [phone, setPhone] = useState(initial.store_phone)
  const [hours, setHours] = useState(initial.opening_hours)
  const [pickup, setPickup] = useState(String(initial.fuel_rate_pickup))
  const [truck, setTruck] = useState(String(initial.fuel_rate_truck))
  const [emails, setEmails] = useState(initial.notify_emails)
  const [cEmail, setCEmail] = useState(initial.contact_email)
  const [ig, setIg] = useState(initial.instagram_url)
  const [tt, setTt] = useState(initial.tiktok_url)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const off = !canEdit || pending
  const offExt = off || !extendedReady

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    start(async () => {
      const res = await safeAction(() =>
        saveSettings({
          wa_number: wa, fuel_rate_pickup: pickup, fuel_rate_truck: truck,
          store_phone: phone, opening_hours: hours, notify_emails: emails,
          contact_email: cEmail, instagram_url: ig, tiktok_url: tt,
        })
      )
      setMsg(res.ok ? { ok: true, text: 'Pengaturan tersimpan.' } : { ok: false, text: res.error })
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card title="Kontak & jam buka" hint="Tampil di situs publik (footer dan halaman Kontak).">
        <div className="space-y-1.5">
          <label htmlFor="wa" className="text-sm font-medium">Nomor WhatsApp toko</label>
          <input id="wa" className={input} value={wa} onChange={(e) => setWa(e.target.value)} disabled={off} inputMode="tel" />
          <p className="text-xs text-muted-foreground">Dipakai tombol WhatsApp di situs publik. Format 08… atau 62… keduanya boleh.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">Telepon toko <span className="font-normal text-muted-foreground">(opsional)</span></label>
          <input id="phone" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} disabled={offExt} inputMode="tel" placeholder="(0343) 123456" />
          <p className="text-xs text-muted-foreground">Kosongkan bila belum dikonfirmasi. Tidak akan ditampilkan bila kosong.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="hours" className="text-sm font-medium">Jam buka <span className="font-normal text-muted-foreground">(opsional)</span></label>
          <textarea
            id="hours"
            rows={3}
            className={area}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            disabled={offExt}
            placeholder={'Senin–Sabtu: 08.00–16.00\nMinggu: libur'}
          />
          <p className="text-xs text-muted-foreground">Satu hari atau rentang per baris, dengan tanda titik dua. Bila kosong, situs menampilkan &quot;tanyakan lewat WhatsApp&quot;.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cemail" className="text-sm font-medium">Email kontak publik <span className="font-normal text-muted-foreground">(opsional)</span></label>
          <input id="cemail" type="email" className={input} value={cEmail} onChange={(e) => setCEmail(e.target.value)} disabled={offExt} placeholder="halo@jjteknik.com" />
          <p className="text-xs text-muted-foreground">Tampil di footer dan halaman Kontak. Terpisah dari penerima email operasional di bawah. Kosong = tidak ditampilkan.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="ig" className="text-sm font-medium">Instagram <span className="font-normal text-muted-foreground">(opsional)</span></label>
            <input id="ig" className={input} value={ig} onChange={(e) => setIg(e.target.value)} disabled={offExt} inputMode="url" placeholder="https://instagram.com/akun" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="tt" className="text-sm font-medium">TikTok <span className="font-normal text-muted-foreground">(opsional)</span></label>
            <input id="tt" className={input} value={tt} onChange={(e) => setTt(e.target.value)} disabled={offExt} inputMode="url" placeholder="https://tiktok.com/@akun" />
          </div>
        </div>
      </Card>

      <Card title="Tarif BBM" hint="Dikali jarak pulang-pergi. Berlaku untuk perhitungan ongkir berikutnya; pesanan yang sudah dibuat tidak berubah.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="pickup" className="text-sm font-medium">BBM Pickup (Rp/km)</label>
            <input id="pickup" className={input} value={pickup} onChange={(e) => setPickup(e.target.value)} disabled={off} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="truck" className="text-sm font-medium">BBM Truk (Rp/km)</label>
            <input id="truck" className={input} value={truck} onChange={(e) => setTruck(e.target.value)} disabled={off} inputMode="numeric" />
          </div>
        </div>
      </Card>

      <Card title="Penerima email" hint="Siapa yang menerima email lead baru, ringkasan pagi (termasuk jadwal bongkar), dan pemberitahuan gagal.">
        <div className="space-y-1.5">
          <label htmlFor="emails" className="text-sm font-medium">Alamat email operasional</label>
          <textarea
            id="emails"
            rows={2}
            className={area}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            disabled={offExt}
            placeholder="admin@contoh.com, gudang@contoh.com"
          />
          <p className="text-xs text-muted-foreground">
            Pisahkan dengan koma, maksimal 10.{' '}
            {emailSource === 'dashboard'
              ? 'Sekarang memakai daftar ini.'
              : emailSource === 'env'
                ? 'Kosong = memakai NOTIFY_EMAILS dari .env (saat ini aktif).'
                : 'Kosong dan NOTIFY_EMAILS di .env juga kosong, jadi hanya owner yang menerima.'}{' '}
            Email owner (OWNER_EMAIL) selalu ikut menerima, dan satu-satunya penerima email audit.
          </p>
        </div>
      </Card>

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-md px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-destructive/10 text-destructive'}`}>
          {msg.text}
        </p>
      )}

      {canEdit ? (
        <Button type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan pengaturan'}</Button>
      ) : (
        <p className="text-sm text-muted-foreground">Hanya owner yang dapat mengubah pengaturan.</p>
      )}
    </form>
  )
}

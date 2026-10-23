'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { saveSettings } from '@/app/dashboard/settings/actions'
import { safeAction } from '@/lib/action-client'
import type { StoreSettings } from '@/lib/settings'

const input =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

export function SettingsForm({ initial, canEdit }: { initial: StoreSettings; canEdit: boolean }) {
  const [wa, setWa] = useState(initial.wa_number)
  const [pickup, setPickup] = useState(String(initial.fuel_rate_pickup))
  const [truck, setTruck] = useState(String(initial.fuel_rate_truck))
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    start(async () => {
      const res = await safeAction(() => saveSettings({ wa_number: wa, fuel_rate_pickup: pickup, fuel_rate_truck: truck }))
      setMsg(res.ok ? { ok: true, text: 'Pengaturan tersimpan.' } : { ok: false, text: res.error })
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border bg-background p-4 sm:p-6">
      <div className="space-y-1.5">
        <label htmlFor="wa" className="text-sm font-medium">Nomor WhatsApp toko</label>
        <input id="wa" className={input} value={wa} onChange={(e) => setWa(e.target.value)} disabled={!canEdit || pending} inputMode="tel" />
        <p className="text-xs text-muted-foreground">Dipakai tombol WhatsApp di situs publik. Format 08… atau 62… keduanya boleh.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="pickup" className="text-sm font-medium">BBM Pickup (Rp/km)</label>
          <input id="pickup" className={input} value={pickup} onChange={(e) => setPickup(e.target.value)} disabled={!canEdit || pending} inputMode="numeric" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="truck" className="text-sm font-medium">BBM Truk (Rp/km)</label>
          <input id="truck" className={input} value={truck} onChange={(e) => setTruck(e.target.value)} disabled={!canEdit || pending} inputMode="numeric" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Tarif dikali jarak pulang-pergi. Berlaku untuk perhitungan ongkir berikutnya, pesanan yang sudah dibuat tidak berubah.
      </p>

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-md px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-destructive/10 text-destructive'}`}>
          {msg.text}
        </p>
      )}

      {canEdit ? (
        <Button type="submit" disabled={pending}>{pending ? 'Menyimpan…' : 'Simpan'}</Button>
      ) : (
        <p className="text-sm text-muted-foreground">Hanya owner yang dapat mengubah pengaturan.</p>
      )}
    </form>
  )
}

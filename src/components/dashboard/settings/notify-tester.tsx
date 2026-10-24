'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendTestEmail, testCalendar, type TestResult } from '@/app/dashboard/settings/notify-actions'
import { safeAction } from '@/lib/action-client'

export function NotifyTester({ status }: { status: { label: string; ok: boolean; hint: string }[] }) {
  const [result, setResult] = useState<{ title: string; r: TestResult } | null>(null)
  const [pending, start] = useTransition()

  const run = (title: string, fn: () => Promise<TestResult>) => {
    setResult(null)
    start(async () => {
      const r = await safeAction(async () => {
        const x = await fn()
        return { ...x, ok: x.ok }
      })
      setResult({ title, r: 'lines' in r ? (r as TestResult) : { ok: false, lines: [(r as { error: string }).error] } })
    })
  }

  return (
    <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-6">
      <div>
        <h2 className="font-semibold">Uji notifikasi</h2>
        <p className="text-sm text-muted-foreground">Cek apakah email dan Google Calendar sudah terhubung. Setelah mengubah .env.local, restart server dulu.</p>
      </div>
      <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
        {status.map((s) => (
          <li key={s.label} className="flex items-start gap-2">
            {s.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" aria-label="ada" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="belum ada" />}
            <span><code className="text-xs">{s.label}</code>{!s.ok && <span className="block text-xs text-muted-foreground">{s.hint}</span>}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => run('Email uji', sendTestEmail)}>Kirim email uji</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => run('Uji kalender', testCalendar)}>Uji Google Calendar</Button>
      </div>
      {pending && <p className="text-sm text-muted-foreground">Menguji…</p>}
      {result && (
        <div role="status" className={`space-y-1 rounded-md px-3 py-2 text-sm ${result.r.ok ? 'bg-green-50 text-green-800' : 'bg-destructive/10 text-destructive'}`}>
          <p className="font-medium">{result.title}: {result.r.ok ? 'berhasil' : 'bermasalah'}</p>
          {result.r.lines.map((l, i) => <p key={i} className="break-words">{l}</p>)}
        </div>
      )}
    </section>
  )
}

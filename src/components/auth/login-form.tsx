'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from './auth-card'
import { signIn } from '@/app/auth/actions'

type Notice = { tone: 'warn' | 'ok' | 'error'; text: string } | null

const NOTICE_CLASS = {
  warn: 'bg-amber-50 text-amber-900',
  ok: 'bg-green-50 text-green-800',
  error: 'bg-destructive/10 text-destructive',
} as const

export function LoginForm({ notice, next }: { notice: Notice; next?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const res = await signIn({ email, password, remember, next })
        if (res.ok) {
          router.replace(res.redirectTo ?? '/dashboard')
          router.refresh()
        } else {
          setError(res.error)
        }
      } catch (err) {
        console.error('[login] gagal:', err)
        setError('Tidak dapat terhubung ke server. Coba lagi.')
      }
    })
  }

  return (
    <AuthCard title="JJ Teknik" subtitle="Masuk ke dashboard admin">
      {notice && <p role="status" className={`mb-4 rounded-md px-3 py-2 text-sm ${NOTICE_CLASS[notice.tone]}`}>{notice.text}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">Lupa password?</Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Ingat saya selama 30 hari
        </label>

        {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={pending}>{pending ? 'Memproses...' : 'Masuk'}</Button>
      </form>
    </AuthCard>
  )
}
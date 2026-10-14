'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard } from './auth-card'
import { requestPasswordReset } from '@/app/auth/actions'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const res = await requestPasswordReset({ email })
        if (res.ok) setMessage(res.message ?? 'Permintaan terkirim.')
        else setError(res.error)
      } catch (err) {
        console.error('[forgot] gagal:', err)
        setError('Tidak dapat terhubung ke server. Coba lagi.')
      }
    })
  }

  return (
    <AuthCard title="Lupa password" subtitle="Kami akan mengirim tautan reset ke email Anda">
      {message ? (
        <div className="space-y-4">
          <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>
          <Link href="/login" className="text-sm hover:underline">Kembali ke halaman masuk</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? 'Mengirim...' : 'Kirim tautan reset'}</Button>
          <Link href="/login" className="block text-center text-sm text-muted-foreground hover:underline">Kembali ke halaman masuk</Link>
        </form>
      )}
    </AuthCard>
  )
}
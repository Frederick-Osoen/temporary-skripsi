import { LoginForm } from '@/components/auth/login-form'

type SP = { expired?: string; reset?: string; error?: string; next?: string }

export default async function LoginPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams

  const notice =
    sp.expired ? { tone: 'warn' as const, text: 'Sesi Anda telah berakhir. Silakan masuk kembali.' }
    : sp.reset ? { tone: 'ok' as const, text: 'Password berhasil diubah. Silakan masuk dengan password baru.' }
    : sp.error === 'link_invalid' ? { tone: 'error' as const, text: 'Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru.' }
    : null

  return <LoginForm notice={notice} next={typeof sp.next === 'string' ? sp.next : undefined} />
}
import { redirect } from 'next/navigation'
import type { AdminFailCode } from '@/lib/auth'

// Sesi habis -> login. Selain itu tampilkan pesan yang tepat, JANGAN dilempar ke halaman lain.
export function AuthProblem({
  code, message, fullScreen = false,
}: { code: AdminFailCode; message: string; fullScreen?: boolean }) {
  if (code === 'UNAUTHENTICATED') redirect('/login?expired=1')

  const title = code === 'FORBIDDEN' ? 'Akses ditolak' : 'Koneksi bermasalah'
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-4 text-center ${fullScreen ? 'min-h-screen' : 'py-16'}`}>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
      {code === 'UNAVAILABLE' && (
        <a href="" className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">Muat ulang</a>
      )}
    </div>
  )
}
'use client'

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-lg font-semibold">Terjadi kesalahan</h1>
      <p className="text-sm text-muted-foreground">Halaman gagal dimuat, kemungkinan karena koneksi. Coba lagi.</p>
      <button onClick={reset} className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">Coba lagi</button>
    </div>
  )
}
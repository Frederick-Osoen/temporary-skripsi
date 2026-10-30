// Kerangka yang meniru bentuk halaman admin, supaya perpindahan menu terasa langsung
// (konten asli menggantikan kerangka ini begitu data siap).
export default function DashboardLoading() {
  return (
    <div className="space-y-4" role="status" aria-label="Memuat halaman">
      <div className="space-y-2">
        <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border bg-background" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-background" />
        ))}
      </div>
      <span className="sr-only">Memuat...</span>
    </div>
  )
}

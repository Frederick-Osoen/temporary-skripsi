// Kerangka halaman saat data dimuat. Muncul hanya bila menunggu > 300 ms (appear-late), jadi tidak berkedip
// untuk respons cepat. Tanpa teks "Loading": bentuknya sudah menjelaskan, dan situsnya berbahasa Indonesia.
export default function DashboardLoading() {
  return (
    <div className="appear-late space-y-4" role="status" aria-busy="true" aria-label="Memuat halaman">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
      <div className="skeleton h-64 w-full" />
    </div>
  )
}

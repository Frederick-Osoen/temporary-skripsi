import { Thermometer } from 'lucide-react'

/**
 * Skala termal: satu-satunya animasi masuk di halaman ini.
 * Murni CSS (clip-path + translate), otomatis mati lewat prefers-reduced-motion.
 * Angkanya menggambarkan situasi acara siang di Jawa Timur, bukan janji spesifikasi.
 */
export function ThermalGauge() {
  return (
    <figure className="panel-ink relative overflow-hidden p-5 sm:p-6">
      <figcaption className="mb-5 flex items-center gap-2 text-xs text-white/60">
        <Thermometer className="size-3.5 text-frost" aria-hidden="true" />
        Yang kami kerjakan di lokasi acara
      </figcaption>

      <div className="flex items-stretch gap-5 sm:gap-7">
        <div className="thermal shrink-0">
          <span className="thermal__glow" aria-hidden="true" />
          <span className="thermal__bar" aria-hidden="true" />
          <span className="thermal__marker" aria-hidden="true" />
        </div>

        <div className="flex flex-1 flex-col justify-between py-0.5">
          <div>
            <p className="spec text-4xl font-bold text-volt sm:text-5xl">34°</p>
            <p className="mt-1 text-sm text-white/65">Udara luar saat acara siang</p>
          </div>
          <div className="my-4 h-px bg-white/10" aria-hidden="true" />
          <div>
            <p className="spec text-4xl font-bold text-frost sm:text-5xl">22°</p>
            <p className="mt-1 text-sm text-white/65">Target di dalam tenda</p>
          </div>
        </div>
      </div>

      <p className="mt-6 border-t border-white/10 pt-4 text-sm text-white/65">
        Jumlah AC dan kapasitas genset kami sesuaikan dengan luas area dan daya yang tersedia.
      </p>
    </figure>
  )
}

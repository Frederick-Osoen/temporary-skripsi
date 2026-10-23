// Ilustrasi garis untuk jam hari-H. Digambar ulang (stroke) saat induknya diberi data-on="true".
const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  pathLength: 1,
  className: 'draw-line',
  style: { ['--len' as string]: 1 },
}

export function TruckArt() {
  return (
    <svg viewBox="0 0 160 100" className="size-full" aria-hidden="true">
      <path {...common} d="M10 70V34h70v36M80 46h26l18 14v10H80" />
      <path {...common} d="M4 82h152" />
      <circle {...common} cx="34" cy="72" r="9" />
      <circle {...common} cx="112" cy="72" r="9" />
      <path {...common} d="M22 44h20v16H22zM50 44h20v16H50z" />
    </svg>
  )
}

export function AcArt() {
  return (
    <svg viewBox="0 0 160 100" className="size-full" aria-hidden="true">
      <rect {...common} x="62" y="10" width="36" height="84" rx="6" />
      <path {...common} d="M70 22h20M70 30h20M70 38h20" />
      <path {...common} d="M104 26c14 0 14 10 28 10M104 40c18 0 18 10 40 10M104 54c14 0 14 10 28 10" />
      <path {...common} d="M56 26c-14 0-14 10-28 10M56 40c-18 0-18 10-40 10M56 54c-14 0-14 10-28 10" />
    </svg>
  )
}

export function GensetArt() {
  return (
    <svg viewBox="0 0 160 100" className="size-full" aria-hidden="true">
      <rect {...common} x="28" y="30" width="84" height="54" rx="6" />
      <path {...common} d="M74 40l-10 16h12l-8 16" />
      <path {...common} d="M112 50h16c8 0 10-6 10-14V12" />
      <path {...common} d="M128 12h20M138 6v12" />
      <path {...common} d="M22 90h96" />
    </svg>
  )
}

export function ChatArt() {
  return (
    <svg viewBox="0 0 160 100" className="size-full" aria-hidden="true">
      <path {...common} d="M30 18h80a10 10 0 0 1 10 10v34a10 10 0 0 1-10 10H62L42 88V72H30a10 10 0 0 1-10-10V28a10 10 0 0 1 10-10z" />
      <path {...common} d="M42 38h56M42 52h36" />
      <circle {...common} cx="132" cy="22" r="8" />
    </svg>
  )
}

export function ReturnArt() {
  return (
    <svg viewBox="0 0 160 100" className="size-full" aria-hidden="true">
      <path {...common} d="M40 30h64v50H40z" />
      <path {...common} d="M40 44h64M62 30v14M82 30v14" />
      <path {...common} d="M130 70c0-24-12-40-36-44M94 18l-6 8 9 5" />
      <path {...common} d="M20 86h120" />
    </svg>
  )
}

export function FanArt() {
  return (
    <svg viewBox="0 0 160 100" className="size-full" aria-hidden="true">
      <circle {...common} cx="70" cy="42" r="30" />
      <path {...common} d="M70 42c-4-14 2-22 10-22M70 42c14-4 22 2 22 10M70 42c4 14-2 22-10 22M70 42c-14 4-22-2-22-10" />
      <path {...common} d="M70 72v18M54 92h32" />
      <path {...common} d="M110 30h6M114 42h10M110 54h6M122 30h4M126 54h4" />
    </svg>
  )
}

export function PartArt() {
  return (
    <svg viewBox="0 0 160 100" className="size-full" aria-hidden="true">
      <rect {...common} x="44" y="22" width="34" height="62" rx="10" />
      <path {...common} d="M54 22v-8M68 22v-8M44 40h34" />
      <path {...common} d="M96 74l26-26a10 10 0 1 1 8 8l-26 26a6 6 0 0 1-8-8z" />
    </svg>
  )
}

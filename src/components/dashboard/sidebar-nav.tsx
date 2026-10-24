'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Package,
  Boxes,
  Wrench,
  Inbox,
  Users,
  Settings,
  CalendarCheck,
  Images,
  Quote,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  ownerOnly?: boolean
  badgeKey?: 'leads'
}

export type NavGroup = { title: string | null; items: NavItem[] }

// Dikelompokkan menurut alur kerja: pesanan masuk -> jadwal -> unit -> konten -> pengaturan
export const NAV_GROUPS: NavGroup[] = [
  { title: null, items: [{ label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard }] },
  {
    title: 'Pesanan',
    items: [
      { label: 'Leads', href: '/dashboard/leads', icon: Inbox, badgeKey: 'leads' },
      { label: 'Pesanan', href: '/dashboard/orders', icon: ClipboardList },
      { label: 'Pelanggan', href: '/dashboard/customers', icon: Users },
    ],
  },
  {
    title: 'Jadwal',
    items: [
      { label: 'Kalender', href: '/dashboard/calendar', icon: CalendarDays },
      { label: 'Ketersediaan', href: '/dashboard/availability', icon: CalendarCheck },
    ],
  },
  {
    title: 'Unit & produk',
    items: [
      { label: 'Produk', href: '/dashboard/products', icon: Package },
      { label: 'Aset Fisik', href: '/dashboard/assets', icon: Boxes },
      { label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
    ],
  },
  {
    title: 'Konten situs',
    items: [
      { label: 'Galeri', href: '/dashboard/gallery', icon: Images },
      { label: 'Testimoni', href: '/dashboard/testimonials', icon: Quote },
    ],
  },
]

// Selalu di bagian paling bawah sidebar
export const NAV_FOOTER: NavItem[] = [
  { label: 'Kelola Admin', href: '/dashboard/admins', icon: ShieldCheck, ownerOnly: true },
  { label: 'Pengaturan', href: '/dashboard/settings', icon: Settings, ownerOnly: true },
]

export const NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), ...NAV_FOOTER]

export const isNavActive = (pathname: string, href: string) =>
  href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

function NavLink({ item, active, badge, onNavigate }: { item: NavItem; active: boolean; badge: number; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-sidebar-primary" aria-hidden="true" />}
      <Icon className={cn('h-4 w-4 shrink-0', active && 'text-sidebar-primary')} aria-hidden="true" />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="min-w-5 rounded-full bg-volt px-1.5 text-center text-[11px] font-bold leading-5 text-volt-foreground">
          {badge > 99 ? '99+' : badge}
          <span className="sr-only"> baru</span>
        </span>
      )}
    </Link>
  )
}

export function SidebarNav({
  role,
  newLeads = 0,
  onNavigate,
}: {
  role: 'owner' | 'admin'
  newLeads?: number
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const allowed = (i: NavItem) => !i.ownerOnly || role === 'owner'
  const footer = NAV_FOOTER.filter(allowed)

  return (
    <nav aria-label="Menu dashboard" className="flex min-h-full flex-col p-3">
      <div className="space-y-4">
        {NAV_GROUPS.map((g, gi) => {
          const items = g.items.filter(allowed)
          if (items.length === 0) return null
          const id = `nav-g-${gi}`
          return (
            <div key={gi} role="group" aria-labelledby={g.title ? id : undefined} className="space-y-0.5">
              {g.title && (
                <p id={id} className="px-3 pb-1 text-[11px] font-semibold text-sidebar-foreground/45">
                  {g.title}
                </p>
              )}
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isNavActive(pathname, item.href)}
                  badge={item.badgeKey === 'leads' ? newLeads : 0}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )
        })}
      </div>
      <div className="min-h-6 flex-1" aria-hidden="true" />
      {footer.length > 0 && (
        <div className="space-y-0.5 border-t border-sidebar-border pt-3">
          {footer.map((item) => (
            <NavLink key={item.href} item={item} active={isNavActive(pathname, item.href)} badge={0} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </nav>
  )
}

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

// "Kelola Admin" (khusus owner) menyusul di Fase 8. Menunya baru ditambahkan saat halamannya ada.
export const NAV_ITEMS: NavItem[] = [
  { label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pesanan', href: '/dashboard/orders', icon: ClipboardList },
  { label: 'Leads', href: '/dashboard/leads', icon: Inbox, badgeKey: 'leads' },
  { label: 'Kalender', href: '/dashboard/calendar', icon: CalendarDays },
  { label: 'Produk', href: '/dashboard/products', icon: Package },
  { label: 'Aset Fisik', href: '/dashboard/assets', icon: Boxes },
  { label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
]

export const isNavActive = (pathname: string, href: string) =>
  href === '/dashboard' ? pathname === href : pathname.startsWith(href)

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
  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || role === 'owner')

  return (
    <nav aria-label="Menu dashboard" className="flex flex-col gap-1 p-3">
      {items.map(({ label, href, icon: Icon, badgeKey }) => {
        const active = isNavActive(pathname, href)
        const badge = badgeKey === 'leads' ? newLeads : 0

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
            )}
          >
            {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-sidebar-primary" aria-hidden="true" />}
            <Icon className={cn('h-4 w-4', active && 'text-sidebar-primary')} aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className="min-w-5 rounded-full bg-volt px-1.5 text-center text-[11px] font-bold leading-5 text-volt-foreground">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

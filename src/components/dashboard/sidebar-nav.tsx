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
  Users,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  ownerOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pesanan', href: '/dashboard/orders', icon: ClipboardList },
  { label: 'Leads', href: '/dashboard/leads', icon: Inbox },
  { label: 'Kalender', href: '/dashboard/calendar', icon: CalendarDays },
  { label: 'Produk', href: '/dashboard/products', icon: Package },
  { label: 'Aset Fisik', href: '/dashboard/assets', icon: Boxes },
  { label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
  { label: 'Kelola Admin', href: '/dashboard/admins', icon: Users, ownerOnly: true },
]

export function SidebarNav({
  role,
  onNavigate,
}: {
  role: 'owner' | 'admin'
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || role === 'owner')

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map(({ label, href, icon: Icon }) => {
        const active =
          href === '/dashboard' ? pathname === href : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
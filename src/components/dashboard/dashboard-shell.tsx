'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, LogOut, Menu, Plus, Search, Snowflake, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, SidebarNav, isNavActive } from './sidebar-nav'

type Props = {
  name: string
  role: 'owner' | 'admin'
  newLeads: number
  signOutAction: () => Promise<void>
  children: React.ReactNode
}

// Tab bawah di HP: 4 menu yang paling sering dipakai + "Menu" untuk sisanya
const BOTTOM_HREFS = ['/dashboard', '/dashboard/orders', '/dashboard/leads', '/dashboard/calendar']

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'JJ'

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-sidebar-ring">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-primary text-sidebar-primary-foreground shadow-sm">
        <Snowflake className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold">JJ Teknik</span>
        <span className="block text-[11px] opacity-70">Dashboard admin</span>
      </span>
    </Link>
  )
}

// Satu-satunya tempat nama admin tampil: kaki sidebar (desktop) / kaki menu (HP)
function Account({ name, role, signOutAction }: Pick<Props, 'name' | 'role' | 'signOutAction'>) {
  return (
    <div className="flex items-center gap-3 border-t border-sidebar-border p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-primary" aria-hidden="true">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <p className="text-xs text-sidebar-foreground/60">{role === 'owner' ? 'Owner' : 'Admin'}</p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          aria-label="Keluar"
          title="Keluar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-white focus-visible:outline-2 focus-visible:outline-sidebar-ring"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}

// Pencarian global: menuju daftar pesanan (kode, nama, nomor HP, tujuan)
function SearchForm({ inputRef, autoFocus, className }: { inputRef?: React.Ref<HTMLInputElement>; autoFocus?: boolean; className?: string }) {
  return (
    <form method="get" action="/dashboard/orders" role="search" className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        ref={inputRef}
        name="q"
        type="search"
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder="Cari pesanan, pelanggan, atau nomor HP"
        aria-label="Cari pesanan"
        className="h-10 w-full rounded-lg border border-input bg-muted/50 pl-9 pr-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border bg-background px-1.5 text-[11px] text-muted-foreground lg:block">/</kbd>
    </form>
  )
}

function LeadsBell({ newLeads }: { newLeads: number }) {
  return (
    <Link
      href="/dashboard/leads"
      aria-label={newLeads > 0 ? `${newLeads} lead baru` : 'Leads, tidak ada yang baru'}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {newLeads > 0 && (
        <span className="absolute right-1 top-1 min-w-4 rounded-full bg-volt px-1 text-center text-[10px] font-bold leading-4 text-volt-foreground" aria-hidden="true">
          {newLeads > 99 ? '99+' : newLeads}
        </span>
      )}
    </Link>
  )
}

export function DashboardShell({ name, role, newLeads, signOutAction, children }: Props) {
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const bottom = NAV_ITEMS.filter((i) => BOTTOM_HREFS.includes(i.href))
  const menuActive = !bottom.some((i) => isNavActive(pathname, i.href))

  // Tekan "/" untuk langsung mencari (kecuali sedang mengetik di kolom lain)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      if (!searchRef.current || searchRef.current.offsetParent === null) return
      e.preventDefault()
      searchRef.current.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen overflow-x-clip bg-muted/40">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 shrink-0 items-center px-5 text-white">
          <Brand />
        </div>
        <div className="scroll-sidebar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SidebarNav role={role} newLeads={newLeads} />
        </div>
        <Account name={name} role={role} signOutAction={signOutAction} />
      </aside>

      {/* Drawer HP: menu lengkap */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex h-dvh w-72 flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="shrink-0 px-5 py-4 text-left">
            <SheetTitle className="sr-only">Menu dashboard</SheetTitle>
            <div className="text-white"><Brand /></div>
          </SheetHeader>
          <div className="scroll-sidebar min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <SidebarNav role={role} newLeads={newLeads} onNavigate={() => setOpen(false)} />
          </div>
          <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
            <Account name={name} role={role} signOutAction={signOutAction} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
          <div className="flex h-14 items-center gap-2 px-4 md:h-16 md:gap-3 md:px-6">
            <div className="md:hidden">
              <Link href="/dashboard" className="flex items-center gap-2.5" aria-label="JJ Teknik, ke Ringkasan">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-primary text-sidebar-primary-foreground">
                  <Snowflake className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-bold">JJ Teknik</span>
              </Link>
            </div>

            <SearchForm inputRef={searchRef} className="hidden max-w-md flex-1 md:block" />
            <div className="flex-1" />

            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-expanded={searchOpen}
              aria-label={searchOpen ? 'Tutup pencarian' : 'Cari pesanan'}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
            >
              {searchOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
            </button>
            <LeadsBell newLeads={newLeads} />
            <Link
              href="/dashboard/orders/new"
              aria-label="Pesanan baru"
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:hidden"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link href="/dashboard/orders/new" className={cn(buttonVariants({ size: 'sm' }), 'hidden h-9 sm:inline-flex')}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> Pesanan baru
            </Link>
          </div>
          {searchOpen && (
            <div className="border-t px-4 py-2 md:hidden">
              <SearchForm autoFocus />
            </div>
          )}
        </header>

        <main className="p-4 pb-24 md:p-6 md:pb-8">{children}</main>
      </div>

      {/* Tab bawah (HP) */}
      <nav
        aria-label="Navigasi cepat"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {bottom.map(({ label, href, icon: Icon, badgeKey }) => {
            const active = isNavActive(pathname, href)
            const badge = badgeKey === 'leads' ? newLeads : 0
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {badge > 0 && (
                      <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-volt px-1 text-center text-[10px] font-bold leading-4 text-volt-foreground">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  {label}
                  {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden="true" />}
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Buka menu lengkap"
              className={cn(
                'flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                menuActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
              Menu
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, Snowflake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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

function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-primary text-sidebar-primary-foreground shadow-sm">
                <Snowflake className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className={cn('leading-tight', compact && 'sr-only md:not-sr-only')}>
                <span className="block text-sm font-bold">JJ Teknik</span>
                <span className="block text-[11px] opacity-70">Dashboard</span>
            </span>
        </Link>
    )
}

export function DashboardShell({ name, role, newLeads, signOutAction, children }: Props) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const bottom = NAV_ITEMS.filter((i) => BOTTOM_HREFS.includes(i.href))
    const menuActive = !bottom.some((i) => isNavActive(pathname, i.href))

    return (
        <div className="min-h-screen bg-muted/40">
            {/* Sidebar desktop (navy) */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
                <div className="flex h-16 items-center border-b border-sidebar-border px-5 text-white">
                    <Brand />
                </div>
                <div className="flex-1 overflow-y-auto">
                    <SidebarNav role={role} newLeads={newLeads} />
                </div>
                <div className="border-t border-sidebar-border p-4 text-sm">
                    <p className="truncate font-medium text-white">{name}</p>
                    <p className="text-xs capitalize opacity-70">{role}</p>
                </div>
            </aside>

            {/* Drawer HP: menu lengkap */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
                    <SheetHeader className="border-b border-sidebar-border px-5 py-4 text-left">
                        <SheetTitle className="sr-only">Menu dashboard</SheetTitle>
                        <div className="text-white"><Brand /></div>
                    </SheetHeader>
                    <SidebarNav role={role} newLeads={newLeads} onNavigate={() => setOpen(false)} />
                    <div className="mt-auto border-t border-sidebar-border p-4 text-sm">
                        <p className="truncate font-medium text-white">{name}</p>
                        <p className="text-xs capitalize opacity-70">{role}</p>
                    </div>
                </SheetContent>
            </Sheet>

            <div className="md:pl-64">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:h-16">
                    <div className="flex items-center gap-2.5 md:hidden">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-primary text-sidebar-primary-foreground">
                            <Snowflake className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-bold">JJ Teknik</span>
                    </div>

                    <div className="flex-1" />

                    <div className="hidden text-right text-sm leading-tight sm:block">
                        <p className="font-medium">{name}</p>
                        <p className="text-xs capitalize text-muted-foreground">{role}</p>
                    </div>

                    <form action={signOutAction}>
                        <Button type="submit" variant="outline" size="sm">
                            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                            Keluar
                        </Button>
                    </form>
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

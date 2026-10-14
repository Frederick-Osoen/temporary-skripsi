'use client'

import { useState } from 'react'
import { Menu, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { SidebarNav } from './sidebar-nav'

type Props = {
    name: string
    role: 'owner' | 'admin'
    signOutAction: () => Promise<void>
    children: React.ReactNode
}

export function DashboardShell({ name, role, signOutAction, children }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Sidebar desktop */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-background md:flex">
                <div className="flex h-14 items-center border-b px-5 font-semibold">
                    JJ Teknik
                </div>
                <SidebarNav role={role} />
            </aside>

            {/* Drawer mobile */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="left" className="w-64 p-0">
                    <SheetHeader className="border-b px-5 py-4">
                        <SheetTitle>JJ Teknik</SheetTitle>
                    </SheetHeader>
                    <SidebarNav role={role} onNavigate={() => setOpen(false)} />
                </SheetContent>
            </Sheet>

            <div className="md:pl-64">
                <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        aria-label="Buka menu"
                        onClick={() => setOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="flex-1" />

                    <div className="hidden text-right text-sm leading-tight sm:block">
                        <p className="font-medium">{name}</p>
                        <p className="text-xs capitalize text-muted-foreground">{role}</p>
                    </div>

                    <form action={signOutAction}>
                        <Button type="submit" variant="outline" size="sm">
                            <LogOut className="mr-2 h-4 w-4" />
                            Keluar
                        </Button>
                    </form>
                </header>

                <main className="p-4 md:p-6">{children}</main>
            </div>
        </div>
    )
}
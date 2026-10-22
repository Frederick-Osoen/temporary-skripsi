import Link from 'next/link'
import { STORE_NAME } from '@/lib/public/config'

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} {STORE_NAME}, Pandaan, Jawa Timur.</p>
      </div>
    </footer>
  )
}
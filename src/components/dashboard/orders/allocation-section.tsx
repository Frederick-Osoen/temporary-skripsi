'use client'

import { useState } from 'react'
import { Boxes } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AllocationData } from '@/lib/orders/allocation'
import { AllocationDialog } from './allocation-dialog'
import { Section } from './ui'

export function AllocationSection({ data }: { data: AllocationData }) {
  const [open, setOpen] = useState(false)

  return (
    <Section title="Alokasi Unit">
      <div className="space-y-3">
        {data.items.map((item) => {
          const out = item.outsourced.reduce((s, v) => s + v.count, 0)
          const remaining = item.qty - item.unit_ids.length - out
          const codeById = new Map(item.units.map((u) => [u.id, u.code]))

          return (
            <div key={item.order_item_id} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{item.product_name} <span className="text-muted-foreground">× {item.qty}</span></p>
                {remaining === 0 ? (
                  <Badge className="border-green-300 bg-green-100 text-green-800" variant="outline">Lengkap</Badge>
                ) : (
                  <Badge className="border-amber-300 bg-amber-100 text-amber-800" variant="outline">Kurang {remaining} unit</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {item.unit_ids.map((id) => (
                  <Badge key={id} variant="secondary">{codeById.get(id) ?? id}</Badge>
                ))}
                {item.outsourced.map((v) => (
                  <Badge key={v.vendor_name} variant="outline">Vendor: {v.vendor_name} × {v.count}</Badge>
                ))}
                {item.unit_ids.length + out === 0 && <span className="text-xs text-muted-foreground">Belum ada unit dialokasikan.</span>}
              </div>
            </div>
          )
        })}
      </div>

      {!data.locked && (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <Boxes className="mr-2 h-4 w-4" /> Atur Alokasi
        </Button>
      )}
      <AllocationDialog data={data} open={open} onOpenChange={setOpen} />
    </Section>
  )
}
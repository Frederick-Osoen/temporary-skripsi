'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, Eye, EyeOff, Pencil, Plus, Star, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { ProductForm } from './product-form'
import { deleteProduct, setProductVisibility } from '@/app/dashboard/products/actions'
import { safeAction } from '@/lib/action-client'
import type { Product } from '@/lib/validations/product'

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export function ProductsTable({ products }: { products: Product[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const [deleting, setDeleting] = useState<Product | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, startDelete] = useTransition()

  const [visibilityError, setVisibilityError] = useState<string | null>(null)
  const [visibilityPendingId, setVisibilityPendingId] = useState<string | null>(null)
  const [, startVisibility] = useTransition()

  function toggleVisibility(p: Product) {
    setVisibilityError(null)
    setVisibilityPendingId(p.id)
    startVisibility(async () => {
      const res = await safeAction(() => setProductVisibility(p.id, !p.is_public))
      if (!res.ok) setVisibilityError(res.error)
      setVisibilityPendingId(null)
    })
  }

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Nama <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={row.original.is_public ? '' : 'text-muted-foreground'}>{row.original.name}</span>
            {row.original.capacity_kva !== null && (
              <Badge variant="outline" className="gap-0.5"><Zap className="h-3 w-3" />{row.original.capacity_kva} kVA</Badge>
            )}
            {row.original.is_featured && (
              <Star className="h-3.5 w-3.5 fill-volt text-volt" aria-label="Produk unggulan" />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Kategori',
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <Badge variant={row.original.category === 'rental' ? 'default' : 'secondary'} className="capitalize">
            {row.original.category}
          </Badge>
        ),
      },
      {
        accessorKey: 'base_price',
        header: ({ column }) => (
          <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Harga Dasar <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => rupiah.format(row.original.base_price),
      },
      { accessorKey: 'total_stock', header: 'Stok' },
      {
        accessorKey: 'is_public',
        header: 'Katalog',
        enableSorting: false,
        cell: ({ row }) => {
          const p = row.original
          return (
            <Button
              variant="ghost"
              size="sm"
              disabled={visibilityPendingId === p.id}
              aria-label={p.is_public ? `Sembunyikan ${p.name} dari katalog` : `Tampilkan ${p.name} di katalog`}
              onClick={() => toggleVisibility(p)}
              className={p.is_public ? 'text-success' : 'text-muted-foreground'}
            >
              {p.is_public ? <Eye className="mr-1.5 h-4 w-4" /> : <EyeOff className="mr-1.5 h-4 w-4" />}
              {p.is_public ? 'Tampil' : 'Tersembunyi'}
            </Button>
          )
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost" size="icon" aria-label="Edit"
              onClick={() => { setEditing(row.original); setFormOpen(true) }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="icon" aria-label="Hapus"
              onClick={() => { setDeleteError(null); setDeleting(row.original) }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [visibilityPendingId]
  )

  const table = useReactTable({
    data: products,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
    autoResetPageIndex: false,
  })

  function confirmDelete() {
    if (!deleting) return
    const id = deleting.id
    startDelete(async () => {
      const res = await safeAction(() => deleteProduct(id))
      if (res.ok) setDeleting(null)
      else setDeleteError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Cari nama produk..."
          className="sm:max-w-xs"
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
        />
        <select
          aria-label="Filter kategori"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={(table.getColumn('category')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('category')?.setFilterValue(e.target.value || undefined)}
        >
          <option value="">Semua kategori</option>
          <option value="rental">Rental</option>
          <option value="sales">Sales</option>
        </select>
        <div className="flex-1" />
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Produk
        </Button>
      </div>

      {visibilityError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{visibilityError}</p>
      )}

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Tidak ada produk.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Halaman {table.getState().pagination.pageIndex + 1} dari {Math.max(table.getPageCount(), 1)} ·{' '}
          {table.getFilteredRowModel().rows.length} produk
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Sebelumnya</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Berikutnya</Button>
        </div>
      </div>

      {/* Dialog tambah/edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
            <DialogDescription>Data produk akan tampil di katalog publik.</DialogDescription>
          </DialogHeader>
          <ProductForm product={editing} onDone={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.name}&quot; akan dihapus permanen. Produk yang sudah dipakai di pesanan atau aset fisik tidak bisa dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePending}>
              {deletePending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
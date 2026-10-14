'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  type PaginationState,
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
import { ArrowUpDown, History as HistoryIcon, Pencil, Plus, Trash2, Wrench, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { AssetForm, STATUS_LABEL } from './asset-form'
import { MaintenanceForm } from './maintenance-form'
import { MaintenanceHistory } from './maintenance-history'
import { deleteAsset } from '@/app/dashboard/assets/actions'
import { safeAction } from '@/lib/action-client'
import type { AssetRow, ProductOption } from '@/lib/validations/asset'

const STATUS_VARIANT: Record<AssetRow['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  available: 'secondary',
  allocated: 'default',
  maintenance: 'outline',
  damaged: 'destructive',
}

const DEFAULT_SORTING: SortingState = [{ id: 'updated_at', desc: true }]
const PAGE_SIZE = 15

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(iso))

export function AssetsTable({ assets, products }: { assets: AssetRow[]; products: ProductOption[] }) {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })
  const goFirstPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }))
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [onlyAlert, setOnlyAlert] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, startDelete] = useTransition()

  // Selalu ambil dari data terbaru
  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  const editing = editingId ? byId.get(editingId) ?? null : null
  const serviceFor = serviceId ? byId.get(serviceId) ?? null : null
  const historyFor = historyId ? byId.get(historyId) ?? null : null
  const deleting = deletingId ? byId.get(deletingId) ?? null : null

  const alertCount = useMemo(
    () => assets.filter((a) => a.alert && a.alert.level !== 'ok').length,
    [assets]
  )
  const data = useMemo(
    () => (onlyAlert ? assets.filter((a) => a.alert && a.alert.level !== 'ok') : assets),
    [assets, onlyAlert]
  )

  const columns = useMemo<ColumnDef<AssetRow>[]>(
    () => [
      {
        accessorKey: 'asset_code',
        header: ({ column }) => (
          <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Kode <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.asset_code}</span>,
      },
      { accessorKey: 'product_name', header: 'Produk', filterFn: 'equalsString' },
      { accessorKey: 'initial_count', header: 'Awal' },
      { accessorKey: 'rental_count', header: 'Disewa' },
      {
        accessorKey: 'total_count',
        header: ({ column }) => (
          <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Total <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]}>{STATUS_LABEL[row.original.status]}</Badge>
        ),
      },
      {
        id: 'alert',
        header: 'Perawatan',
        cell: ({ row }) => {
          const a = row.original.alert
          if (!a) return <span className="text-muted-foreground">-</span>
          const detail =
            `Cuci: ${a.cuci.since}x sejak servis terakhir (berikutnya di total ${a.cuci.warnAt}x) · ` +
            `Besar: ${a.besar.since}x (berikutnya di total ${a.besar.warnAt}x)`
          if (a.level === 'ok') return <span className="text-sm text-muted-foreground" title={detail}>Normal</span>
          return (
            <Badge
              variant={a.level === 'urgent' ? 'destructive' : 'outline'}
              className={a.level === 'warning' ? 'border-amber-500 text-amber-700' : undefined}
              title={detail}
            >
              {a.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: ({ column }) => (
          <Button variant="ghost" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Diubah <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        sortingFn: 'basic',
        sortDescFirst: true,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(row.original.updated_at)}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" aria-label="Riwayat servis" title="Riwayat servis" onClick={() => setHistoryId(row.original.id)}>
              <HistoryIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Catat service" title="Catat service" onClick={() => setServiceId(row.original.id)}>
              <Wrench className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditingId(row.original.id); setFormOpen(true) }}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => { setDeleteError(null); setDeletingId(row.original.id) }}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, pagination },
    autoResetPageIndex: false,
    onPaginationChange: setPagination,
    onSortingChange: (updater) => { setSorting(updater); goFirstPage() },
    onColumnFiltersChange: (updater) => { setColumnFilters(updater); goFirstPage() },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Pengaman: jika halaman aktif sudah tidak ada (mis. item terakhir dihapus), mundur ke halaman terakhir
  const pageCount = table.getPageCount()
  useEffect(() => {
    if (pagination.pageIndex > 0 && pagination.pageIndex >= pageCount) {
      setPagination((p) => ({ ...p, pageIndex: Math.max(pageCount - 1, 0) }))
    }
  }, [pageCount, pagination.pageIndex])

  const isDefaultSort = sorting.length === 1 && sorting[0].id === 'updated_at' && sorting[0].desc
  const isDirty = !isDefaultSort || columnFilters.length > 0 || onlyAlert

  function resetView() {
    setSorting(DEFAULT_SORTING)
    setColumnFilters([])
    setOnlyAlert(false)
    goFirstPage()
  }

  function confirmDelete() {
    if (!deleting) return
    const id = deleting.id
    startDelete(async () => {
      const res = await safeAction(() => deleteAsset(id))
      if (res.ok) setDeletingId(null)
      else setDeleteError(res.error)
    })
  }

  const filterSelect = 'h-9 rounded-md border border-input bg-background px-3 text-sm'

  return (
    <div className="space-y-4">
      {alertCount > 0 && (
        <button
          type="button"
          onClick={() => { setOnlyAlert((v) => !v); goFirstPage() }}
          className="w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-left text-sm text-amber-900"
        >
          {alertCount} unit AC perlu perawatan. {onlyAlert ? 'Klik untuk tampilkan semua.' : 'Klik untuk menampilkan hanya unit ini.'}
        </button>
      )}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Input
          placeholder="Cari kode aset..."
          className="lg:max-w-xs"
          value={(table.getColumn('asset_code')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('asset_code')?.setFilterValue(e.target.value)}
        />
        <select
          aria-label="Filter produk"
          className={filterSelect}
          value={(table.getColumn('product_name')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('product_name')?.setFilterValue(e.target.value || undefined)}
        >
          <option value="">Semua produk</option>
          {products.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <select
          aria-label="Filter status"
          className={filterSelect}
          value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value || undefined)}
        >
          <option value="">Semua status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <Button variant="outline" onClick={resetView} disabled={!isDirty}>
          <RotateCcw className="mr-2 h-4 w-4" /> Reset Filter
        </Button>
        <div className="flex-1" />
        <Button onClick={() => { setEditingId(null); setFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Unit
        </Button>
      </div>

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
                  Tidak ada unit.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Halaman {table.getState().pagination.pageIndex + 1} dari {Math.max(table.getPageCount(), 1)} ·{' '}
          {table.getFilteredRowModel().rows.length} unit
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Sebelumnya</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Berikutnya</Button>
        </div>
      </div>

      {/* Tambah / edit unit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Unit' : 'Tambah Unit'}</DialogTitle>
            <DialogDescription>Stok produk akan menyesuaikan jumlah unit secara otomatis.</DialogDescription>
          </DialogHeader>
          {editingId && !editing ? (
            <p className="py-4 text-sm text-muted-foreground">Unit ini sudah tidak ada (mungkin dihapus pihak lain).</p>
          ) : (
            <AssetForm
              // key berisi versi: setelah "Muat data terbaru", form dibuat ulang dengan nilai terbaru
              key={`${editing?.id ?? 'new'}:${editing?.version ?? 0}`}
              asset={editing}
              products={products}
              onDone={() => setFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Catat service */}
      <Dialog open={!!serviceFor} onOpenChange={(o) => !o && setServiceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Service</DialogTitle>
            <DialogDescription>Mereset hitungan peringatan perawatan unit ini.</DialogDescription>
          </DialogHeader>
          {serviceFor && <MaintenanceForm asset={serviceFor} onDone={() => setServiceId(null)} />}
        </DialogContent>
      </Dialog>

      {/* Riwayat servis */}
      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Riwayat Servis {historyFor?.asset_code}</DialogTitle>
            <DialogDescription>
              {historyFor?.product_name} · total sewa saat ini {historyFor?.total_count}x
            </DialogDescription>
          </DialogHeader>
          {historyFor && <MaintenanceHistory asset={historyFor} />}
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus unit {deleting?.asset_code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh riwayat maintenance unit ini ikut terhapus. Unit yang pernah dipakai di pesanan tidak bisa dihapus.
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
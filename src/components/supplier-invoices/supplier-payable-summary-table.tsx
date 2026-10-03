'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Eye, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'
import { SupplierInvoice } from '@/types'
import { StatusDot } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS } from '@/components/dashboard/report-bar-chart'
import { cn } from '@/lib/utils'
import {
  formatSupplierCurrency as formatCurrency,
  supplierInvoiceStatusTone,
} from '@/components/supplier-invoices/supplier-invoice-status'

export type SupplierPayableGroup = {
  supplierId: string
  supplierName: string
  invoiceCount: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  status: SupplierInvoice['status']
  invoices: SupplierInvoice[]
}

const ITEMS_PER_PAGE = 20

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const headerIconBtnClass =
  'flex h-8 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-white/45 dark:hover:text-white'

const headerPrimaryBtnClass =
  'casa-artesanal-preserve-surface inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'

const filterSelectWrapClass = 'relative h-8 shrink-0 border-l border-zinc-200 dark:border-white/[0.08]'

const filterSelectClass =
  'block h-full w-full cursor-pointer appearance-none truncate border-0 bg-transparent pl-3 pr-8 text-[13px] text-zinc-600 transition-colors hover:text-zinc-900 focus:outline-none dark:text-white/60 dark:hover:text-white'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'

const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

const statusFilters = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'partial', label: 'Parcial' },
  { value: 'paid', label: 'Al día' },
  { value: 'cancelled', label: 'Anulado' },
]

function groupStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'partial':
      return 'Parcial'
    case 'paid':
      return 'Al día'
    case 'cancelled':
      return 'Anulado'
    default:
      return status
  }
}

/** Agrupa facturas por proveedor y calcula totales / estado agregado (similar a créditos por cliente). */
export function groupInvoicesBySupplier(invoices: SupplierInvoice[]): SupplierPayableGroup[] {
  const map = new Map<string, SupplierInvoice[]>()
  for (const inv of invoices) {
    const key = inv.supplierId || '__sin_proveedor__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(inv)
  }

  const groups: SupplierPayableGroup[] = []
  for (const [supplierId, list] of map) {
    const active = list.filter((i) => i.status !== 'cancelled')
    const supplierName =
      list.find((i) => (i.supplierName || '').trim())?.supplierName?.trim() ||
      (supplierId === '__sin_proveedor__' ? 'Sin proveedor' : 'Proveedor')

    const totalAmount = active.reduce((s, i) => s + i.totalAmount, 0)
    const paidAmount = active.reduce((s, i) => s + i.paidAmount, 0)
    const pendingAmount = active.reduce((s, i) => s + Math.max(0, i.totalAmount - i.paidAmount), 0)

    let status: SupplierInvoice['status'] = 'pending'
    if (active.length === 0) {
      status = 'cancelled'
    } else if (pendingAmount <= 0) {
      status = 'paid'
    } else if (paidAmount > 0) {
      status = 'partial'
    } else {
      status = 'pending'
    }

    groups.push({
      supplierId: supplierId === '__sin_proveedor__' ? '' : supplierId,
      supplierName,
      invoiceCount: list.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      status,
      invoices: list,
    })
  }

  return groups.sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'es'))
}

interface SupplierPayableSummaryTableProps {
  groups: SupplierPayableGroup[]
  onCreate: () => void
  canCreate?: boolean
  isLoading?: boolean
  onRefresh?: () => void
}

export function SupplierPayableSummaryTable({
  groups,
  onCreate,
  canCreate = true,
  isLoading = false,
  onRefresh,
}: SupplierPayableSummaryTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const summary = useMemo(() => {
    let pending = 0
    let paid = 0
    let withBalance = 0
    let openInvoices = 0
    for (const g of groups) {
      pending += g.pendingAmount
      paid += g.paidAmount
      if (g.pendingAmount > 0) withBalance += 1
      openInvoices += g.invoices.filter(
        (i) => i.status !== 'cancelled' && i.totalAmount - i.paidAmount > 0
      ).length
    }
    return { pending, paid, withBalance, openInvoices }
  }, [groups])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return groups.filter((g) => {
      const matchesSearch = !q || (g.supplierName || '').toLowerCase().includes(q)
      const matchesStatus = filterStatus === 'all' || g.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [groups, searchTerm, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginated = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openSupplier = (g: SupplierPayableGroup) => {
    const id = g.supplierId || '__sin_proveedor__'
    router.push(`/purchases/invoices/supplier/${encodeURIComponent(id)}`)
  }

  const renderStatus = (g: SupplierPayableGroup) => (
    <span className="inline-flex items-center gap-1.5">
      <StatusDot tone={supplierInvoiceStatusTone(g.status)} />
      {groupStatusLabel(g.status)}
    </span>
  )

  const renderPending = (g: SupplierPayableGroup) => (
    <span
      className={cn('font-medium tabular-nums', g.pendingAmount <= 0 && 'text-zinc-400 dark:text-zinc-500')}
      style={g.pendingAmount > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
    >
      {formatCurrency(g.pendingAmount)}
    </span>
  )

  const renderViewButton = (g: SupplierPayableGroup) => (
    <button
      type="button"
      className={rowIconBtnClass}
      title="Ver facturas del proveedor"
      aria-label={`Ver facturas de ${g.supplierName}`}
      onClick={(e) => {
        e.stopPropagation()
        openSupplier(g)
      }}
    >
      <Eye className="h-4 w-4" strokeWidth={1.5} />
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">Proveedores</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Cuentas por pagar por proveedor en la tienda seleccionada.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className={headerIconBtnClass}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} strokeWidth={1.5} />
            </button>
          )}
          {canCreate && (
            <button type="button" onClick={onCreate} className={headerPrimaryBtnClass}>
              <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Nueva factura
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Por pagar</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={!isLoading && summary.pending > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
          >
            {isLoading ? '…' : formatCurrency(summary.pending)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Proveedores con saldo</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
            {isLoading ? '…' : summary.withBalance}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Facturas abiertas</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
            {isLoading ? '…' : summary.openInvoices}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Total pagado</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={!isLoading && summary.paid > 0 ? { color: REPORT_CHART_COLORS.tertiary } : undefined}
          >
            {isLoading ? '…' : formatCurrency(summary.paid)}
          </p>
        </div>
      </div>

      <div
        className={cn(
          'casa-artesanal-preserve-surface relative flex flex-wrap items-center rounded-xl border border-zinc-200 p-1 transition-colors sm:flex-nowrap',
          'focus-within:border-zinc-300 dark:border-white/[0.1] dark:focus-within:border-white/20'
        )}
      >
        <div className="relative flex min-w-[12rem] flex-1 items-center">
          <Search className="pointer-events-none absolute left-2 h-4 w-4 text-zinc-400 dark:text-white/35" strokeWidth={1.5} aria-hidden />
          <input
            type="search"
            placeholder="Buscar proveedor…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar proveedores"
            className="h-8 w-full min-w-0 border-0 bg-transparent pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-white/35 [&::-webkit-search-cancel-button]:hidden"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-1.5 p-1 text-zinc-400 hover:text-zinc-800 dark:text-white/40 dark:hover:text-white"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>
        <div className={cn(filterSelectWrapClass, 'min-w-[10.5rem]')}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filtrar por estado"
            className={filterSelectClass}
          >
            {statusFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40"
            aria-hidden
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando proveedores…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {groups.length === 0 ? 'No hay proveedores' : 'Ningún proveedor coincide'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            {groups.length === 0
              ? 'Registra la primera factura con «Nueva factura».'
              : 'Prueba otra búsqueda u otro estado.'}
          </p>
        </div>
      ) : (
        <>
          <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
            {paginated.map((g) => (
              <div
                key={g.supplierId || '__none__'}
                role="button"
                tabIndex={0}
                className="casa-artesanal-preserve-surface flex cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                onClick={() => openSupplier(g)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openSupplier(g)
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{g.supplierName}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {g.invoiceCount} factura{g.invoiceCount !== 1 ? 's' : ''} · Total {formatCurrency(g.totalAmount)}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    {renderPending(g)}
                    <span className="text-zinc-300 dark:text-white/20">·</span>
                    {renderStatus(g)}
                  </p>
                </div>
                {renderViewButton(g)}
              </div>
            ))}
          </div>

          <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <th className={thClass}>Proveedor</th>
                  <th className={cn(thClass, 'text-right')}>Facturas</th>
                  <th className={cn(thClass, 'text-right')}>Total</th>
                  <th className={cn(thClass, 'text-right')}>Pagado</th>
                  <th className={cn(thClass, 'text-right')}>Pendiente</th>
                  <th className={thClass}>Estado</th>
                  <th className={cn(thClass, 'w-12')}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((g) => (
                  <tr
                    key={g.supplierId || '__none__'}
                    className="casa-artesanal-preserve-surface cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                    onClick={() => openSupplier(g)}
                  >
                    <td className={cn(tdClass, 'max-w-[20rem] font-medium text-zinc-900 dark:text-zinc-100')}>
                      <span className="line-clamp-2" title={g.supplierName}>
                        {g.supplierName}
                      </span>
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums text-zinc-500 dark:text-zinc-400')}>
                      {g.invoiceCount}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>
                      {formatCurrency(g.totalAmount)}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums text-zinc-500 dark:text-zinc-400')}>
                      {formatCurrency(g.paidAmount)}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-right')}>{renderPending(g)}</td>
                    <td className={cn(tdClass, 'whitespace-nowrap')}>{renderStatus(g)}</td>
                    <td className="px-3 py-1.5">{renderViewButton(g)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > ITEMS_PER_PAGE && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPage={goToPage} />
          )}
        </>
      )}
    </div>
  )
}

export function Pagination({
  currentPage,
  totalPages,
  onPage,
}: {
  currentPage: number
  totalPages: number
  onPage: (page: number) => void
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 sm:pr-16">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Página {currentPage} de {totalPages}
      </p>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPage(page)}
                className={cn(
                  'casa-artesanal-preserve-surface flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] tabular-nums transition-colors',
                  currentPage === page
                    ? 'bg-zinc-100 font-semibold text-zinc-900 dark:bg-white/[0.1] dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                )}
              >
                {page}
              </button>
            )
          }
          if (page === currentPage - 2 || page === currentPage + 2) {
            return (
              <span key={page} className="px-1 text-sm text-zinc-400 dark:text-zinc-500">
                …
              </span>
            )
          }
          return null
        })}
        <button
          type="button"
          onClick={() => onPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

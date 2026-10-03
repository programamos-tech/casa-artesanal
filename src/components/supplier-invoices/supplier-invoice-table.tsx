'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Eye, ChevronDown, X } from 'lucide-react'
import { SupplierInvoice } from '@/types'
import { StatusDot } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS } from '@/components/dashboard/report-bar-chart'
import { Pagination } from '@/components/supplier-invoices/supplier-payable-summary-table'
import { cn } from '@/lib/utils'
import {
  formatSupplierCurrency as formatCurrency,
  formatSupplierDate as formatDate,
  supplierDueDateClass,
  supplierInvoiceStatusLabel,
  supplierInvoiceStatusTone,
} from '@/components/supplier-invoices/supplier-invoice-status'

const ITEMS_PER_PAGE = 20

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const filterSelectWrapClass = 'relative h-8 shrink-0 border-l border-zinc-200 dark:border-white/[0.08]'

const filterSelectClass =
  'block h-full w-full cursor-pointer appearance-none truncate border-0 bg-transparent pl-3 pr-8 text-[13px] text-zinc-600 transition-colors hover:text-zinc-900 focus:outline-none dark:text-white/60 dark:hover:text-white'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'

const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

const statusFilters = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'partial', label: 'Parcial' },
  { value: 'paid', label: 'Pagada' },
  { value: 'cancelled', label: 'Anulada' },
]

/** Hora en que se registró la factura (para orientarse cuando varias comparten la misma fecha de emisión). */
function formatRegisteredTime(createdAtIso: string) {
  return new Date(createdAtIso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

interface SupplierInvoiceTableProps {
  invoices: SupplierInvoice[]
  onView: (inv: SupplierInvoice) => void
  isLoading?: boolean
}

export function SupplierInvoiceTable({ invoices, onView, isLoading = false }: SupplierInvoiceTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const list = invoices.filter((inv) => {
      const matchesSearch = !q || inv.invoiceNumber.toLowerCase().includes(q)
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus
      return matchesSearch && matchesStatus
    })
    list.sort((a, b) => {
      const tb = new Date(b.createdAt).getTime()
      const ta = new Date(a.createdAt).getTime()
      if (tb !== ta) return tb - ta
      return b.id.localeCompare(a.id)
    })
    return list
  }, [invoices, searchTerm, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginated = filteredSorted.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pendingOf = (inv: SupplierInvoice) =>
    inv.status === 'cancelled' ? 0 : Math.max(0, inv.totalAmount - inv.paidAmount)

  const renderStatus = (inv: SupplierInvoice) => (
    <span className="inline-flex items-center gap-1.5">
      <StatusDot tone={supplierInvoiceStatusTone(inv.status)} />
      {supplierInvoiceStatusLabel(inv.status)}
    </span>
  )

  const renderPending = (inv: SupplierInvoice) => {
    const pending = pendingOf(inv)
    return (
      <span
        className={cn('font-medium tabular-nums', pending <= 0 && 'text-zinc-400 dark:text-zinc-500')}
        style={pending > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
      >
        {formatCurrency(pending)}
      </span>
    )
  }

  const showDue = (inv: SupplierInvoice) => Boolean(inv.dueDate) && inv.status !== 'paid' && inv.status !== 'cancelled'

  const renderViewButton = (inv: SupplierInvoice) => (
    <button
      type="button"
      className={rowIconBtnClass}
      title="Ver factura"
      aria-label={`Ver factura ${inv.invoiceNumber}`}
      onClick={(e) => {
        e.stopPropagation()
        onView(inv)
      }}
    >
      <Eye className="h-4 w-4" strokeWidth={1.5} />
    </button>
  )

  return (
    <div className="space-y-3">
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
            placeholder="Buscar por número de factura…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar facturas"
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
          <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando facturas…</p>
        </div>
      ) : filteredSorted.length === 0 ? (
        <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {invoices.length === 0 ? 'No hay facturas' : 'Ninguna factura coincide'}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            {invoices.length === 0
              ? 'Registra la primera con «Nueva factura».'
              : 'Prueba otro número u otro estado.'}
          </p>
        </div>
      ) : (
        <>
          <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
            {paginated.map((inv) => (
              <div
                key={inv.id}
                role="button"
                tabIndex={0}
                className="casa-artesanal-preserve-surface flex cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                onClick={() => onView(inv)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onView(inv)
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium text-zinc-900 dark:text-zinc-50">{inv.invoiceNumber}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(inv.issueDate)} · Total {formatCurrency(inv.totalAmount)}
                    {showDue(inv) ? (
                      <>
                        {' · Vence '}
                        <span className={supplierDueDateClass(inv.dueDate)}>{formatDate(inv.dueDate!)}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    {renderPending(inv)}
                    <span className="text-zinc-300 dark:text-white/20">·</span>
                    {renderStatus(inv)}
                  </p>
                </div>
                {renderViewButton(inv)}
              </div>
            ))}
          </div>

          <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <th className={thClass}>Factura</th>
                  <th className={thClass}>Emisión</th>
                  <th className={thClass}>Vence</th>
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
                {paginated.map((inv) => (
                  <tr
                    key={inv.id}
                    className="casa-artesanal-preserve-surface cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                    onClick={() => onView(inv)}
                  >
                    <td className={cn(tdClass, 'whitespace-nowrap font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100')}>
                      {inv.invoiceNumber}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                      {formatDate(inv.issueDate)}
                      <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">{formatRegisteredTime(inv.createdAt)}</span>
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                      {showDue(inv) ? (
                        <span className={supplierDueDateClass(inv.dueDate)}>{formatDate(inv.dueDate!)}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums text-zinc-500 dark:text-zinc-400')}>
                      {formatCurrency(inv.paidAmount)}
                    </td>
                    <td className={cn(tdClass, 'whitespace-nowrap text-right')}>{renderPending(inv)}</td>
                    <td className={cn(tdClass, 'whitespace-nowrap')}>{renderStatus(inv)}</td>
                    <td className="px-3 py-1.5">{renderViewButton(inv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSorted.length > ITEMS_PER_PAGE && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPage={goToPage} />
          )}
        </>
      )}
    </div>
  )
}

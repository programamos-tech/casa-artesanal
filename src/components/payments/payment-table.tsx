'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Eye, RefreshCw, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react'
import { Credit } from '@/types'
import { StatusDot } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS } from '@/components/dashboard/report-bar-chart'
import { cn } from '@/lib/utils'
import {
  creditStatusLabel,
  creditStatusTone,
  getConsolidatedCreditDisplayStatus,
  parseCreditDueDateLocal,
} from '@/lib/credit-status-ui'

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
  { value: 'overdue', label: 'Vencido' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Anulado' },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function dueDateInfo(dueDate?: string) {
  const due = parseCreditDueDateLocal(dueDate)
  if (!due) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  return {
    label: due.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    className:
      diffDays < 0
        ? 'text-rose-600 dark:text-rose-400'
        : diffDays <= 7
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-zinc-500 dark:text-zinc-400',
  }
}

interface CreditTableProps {
  credits: Credit[]
  onView: (credit: Credit) => void
  onCreate: () => void
  isLoading?: boolean
  onRefresh?: () => void
  todayPaymentsTotal?: number
}

export function CreditTable({
  credits,
  onView,
  onCreate,
  isLoading = false,
  onRefresh,
  todayPaymentsTotal,
}: CreditTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const summary = useMemo(() => {
    let pending = 0
    let withBalance = 0
    let overdue = 0
    for (const credit of credits) {
      if (credit.pendingAmount > 0) {
        pending += credit.pendingAmount
        withBalance += 1
      }
      if (getConsolidatedCreditDisplayStatus(credit) === 'overdue') overdue += 1
    }
    return { pending, withBalance, overdue }
  }, [credits])

  const filteredCredits = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return credits.filter(credit => {
      const matchesSearch =
        !term ||
        credit.clientName.toLowerCase().includes(term) ||
        credit.invoiceNumber.toLowerCase().includes(term)
      const matchesStatus = filterStatus === 'all' || getConsolidatedCreditDisplayStatus(credit) === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [credits, searchTerm, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filteredCredits.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedCredits = filteredCredits.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderStatus = (credit: Credit) => {
    const status = getConsolidatedCreditDisplayStatus(credit)
    return (
      <span className="inline-flex items-center gap-1.5">
        <StatusDot tone={creditStatusTone(status, credit)} />
        {creditStatusLabel(status, credit)}
      </span>
    )
  }

  const renderPending = (credit: Credit) => (
    <span
      className={cn('font-medium tabular-nums', credit.pendingAmount <= 0 && 'text-zinc-400 dark:text-zinc-500')}
      style={credit.pendingAmount > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
    >
      {formatCurrency(Math.max(0, credit.pendingAmount))}
    </span>
  )

  const renderViewButton = (credit: Credit) => (
    <button
      type="button"
      className={rowIconBtnClass}
      title="Ver créditos del cliente"
      aria-label={`Ver créditos de ${credit.clientName}`}
      onClick={e => {
        e.stopPropagation()
        onView(credit)
      }}
    >
      <Eye className="h-4 w-4" strokeWidth={1.5} />
    </button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">Créditos</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Saldos por cliente en la tienda seleccionada.</p>
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
          <button type="button" onClick={onCreate} className={headerPrimaryBtnClass}>
            <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Nuevo crédito
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Saldo pendiente</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={!isLoading && summary.pending > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
          >
            {isLoading ? '…' : formatCurrency(summary.pending)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Clientes con saldo</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
            {isLoading ? '…' : summary.withBalance}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Vencidos</p>
          <p
            className={cn(
              'mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white',
              !isLoading && summary.overdue > 0 && 'text-rose-600 dark:text-rose-400'
            )}
          >
            {isLoading ? '…' : summary.overdue}
          </p>
        </div>
        {todayPaymentsTotal !== undefined && (
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Otorgado hoy</p>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
              {isLoading ? '…' : formatCurrency(todayPaymentsTotal)}
            </p>
          </div>
        )}
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
            placeholder="Buscar cliente…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Buscar créditos"
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
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filtrar por estado del crédito"
            className={filterSelectClass}
          >
            {statusFilters.map(option => (
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
          <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando créditos…</p>
        </div>
      ) : filteredCredits.length === 0 ? (
        <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No hay créditos que coincidan</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Prueba otra búsqueda o crea uno con «Nuevo crédito».
          </p>
        </div>
      ) : (
        <>
          <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
            {paginatedCredits.map(credit => {
              const due = getConsolidatedCreditDisplayStatus(credit) !== 'completed' ? dueDateInfo(credit.dueDate) : null
              return (
                <div
                  key={credit.id}
                  role="button"
                  tabIndex={0}
                  className="casa-artesanal-preserve-surface flex cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  onClick={() => onView(credit)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onView(credit)
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{credit.clientName}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {credit.invoiceNumber} · Total {formatCurrency(credit.totalAmount)}
                      {due ? (
                        <>
                          {' · Vence '}
                          <span className={due.className}>{due.label}</span>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                      {renderPending(credit)}
                      <span className="text-zinc-300 dark:text-white/20">·</span>
                      {renderStatus(credit)}
                    </p>
                  </div>
                  {renderViewButton(credit)}
                </div>
              )
            })}
          </div>

          <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                  <th className={thClass}>Cliente</th>
                  <th className={thClass}>Facturas</th>
                  <th className={cn(thClass, 'text-right')}>Total</th>
                  <th className={cn(thClass, 'text-right')}>Pagado</th>
                  <th className={cn(thClass, 'text-right')}>Pendiente</th>
                  <th className={thClass}>Estado</th>
                  <th className={thClass}>Vencimiento</th>
                  <th className={cn(thClass, 'w-12')}>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCredits.map(credit => {
                  const due = getConsolidatedCreditDisplayStatus(credit) !== 'completed' ? dueDateInfo(credit.dueDate) : null
                  return (
                    <tr
                      key={credit.id}
                      className="casa-artesanal-preserve-surface cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                      onClick={() => onView(credit)}
                    >
                      <td className={cn(tdClass, 'max-w-[18rem] font-medium text-zinc-900 dark:text-zinc-100')}>
                        <span className="line-clamp-2" title={credit.clientName}>
                          {credit.clientName}
                        </span>
                      </td>
                      <td className={cn(tdClass, 'whitespace-nowrap text-zinc-500 dark:text-zinc-400')}>
                        {credit.invoiceNumber}
                      </td>
                      <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>
                        {formatCurrency(credit.totalAmount)}
                      </td>
                      <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums text-zinc-500 dark:text-zinc-400')}>
                        {formatCurrency(credit.paidAmount)}
                      </td>
                      <td className={cn(tdClass, 'whitespace-nowrap text-right')}>{renderPending(credit)}</td>
                      <td className={cn(tdClass, 'whitespace-nowrap')}>{renderStatus(credit)}</td>
                      <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                        {due ? <span className={due.className}>{due.label}</span> : <span className="text-zinc-400">—</span>}
                      </td>
                      <td className="px-3 py-1.5">{renderViewButton(credit)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredCredits.length > ITEMS_PER_PAGE && (
            <div className="mt-4 flex items-center justify-between gap-3 sm:pr-16">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => goToPage(page)}
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
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Plus,
  Search,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react'
import { Credit } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'
import {
  creditStatusBadgeClass,
  creditStatusIconClass,
  creditStatusLabel,
  getConsolidatedCreditDisplayStatus,
  isCreditCancelled,
} from '@/lib/credit-status-ui'

const badgeTint = 'casa-artesanal-preserve-surface'

const heroIconClass = 'text-indigo-600 dark:text-indigo-400'

const thClass =
  'casa-artesanal-preserve-surface whitespace-nowrap bg-zinc-100/95 px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-400'

const getStatusIcon = (status: string, credit?: Credit) => {
  const cls = creditStatusIconClass(status, credit)
  if (isCreditCancelled(credit)) {
    return <XCircle className={cls} />
  }
  switch (status) {
    case 'completed':
      return <CheckCircle className={cls} />
    case 'partial':
      return <Clock className={cls} />
    case 'pending':
      return <AlertCircle className={cls} />
    case 'overdue':
      return <XCircle className={cls} />
    case 'cancelled':
      return <XCircle className={cls} />
    default:
      return <AlertCircle className={cls} />
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
  todayPaymentsTotal
}: CreditTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const getDueDateClass = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) {
      return 'font-medium tabular-nums text-zinc-800 dark:text-zinc-200'
    }
    if (diffDays <= 7) {
      return 'font-medium tabular-nums text-zinc-700 dark:text-zinc-300'
    }
    return 'tabular-nums text-zinc-600 dark:text-zinc-400'
  }

  const totalDebt = credits
    .filter(credit => credit.pendingAmount > 0)
    .reduce((sum, credit) => sum + credit.pendingAmount, 0)

  const filteredCredits = credits.filter(credit => {
    const matchesSearch =
      credit.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      credit.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const displayStatus = getConsolidatedCreditDisplayStatus(credit)
    const matchesStatus = filterStatus === 'all' || displayStatus === filterStatus
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredCredits.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCredits = filteredCredits.slice(startIndex, startIndex + itemsPerPage)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openClient = (credit: Credit) => {
    router.push(`/payments/${credit.clientId}`)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className={cn('relative overflow-hidden', cardShell)}>
        <CardHeader className="space-y-0 border-b border-zinc-200/80 p-4 dark:border-zinc-800 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <CreditCard className={cn('h-5 w-5 shrink-0', heroIconClass)} strokeWidth={1.5} aria-hidden />
                <span>Gestión de créditos</span>
                <StoreBadge />
                {searchTerm.trim() ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      badgeTint,
                      'border-0 bg-zinc-100/90 text-[11px] font-normal text-zinc-600 dark:bg-zinc-900/45 dark:text-zinc-400'
                    )}
                  >
                    Búsqueda activa
                  </Badge>
                ) : null}
              </CardTitle>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {searchTerm.trim()
                  ? 'Resultados filtrados por búsqueda o estado'
                  : 'Administra créditos y pagos pendientes por cliente'}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-0.5 text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Deuda total{' '}
                  <span className="font-semibold tabular-nums text-rose-700 dark:text-rose-300/95">
                    {formatCurrency(totalDebt)}
                  </span>
                </span>
                {todayPaymentsTotal !== undefined && (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Otorgado hoy{' '}
                    <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300/95">
                      {formatCurrency(todayPaymentsTotal)}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400',
                      isLoading && 'animate-spin'
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="hidden md:inline">Actualizar</span>
                </Button>
              )}
              <Button
                onClick={onCreate}
                size="sm"
                className="flex-1 border-transparent bg-brand-700 text-white hover:bg-brand-800 sm:flex-none dark:bg-brand-600 dark:hover:bg-brand-500 [&_svg]:text-white"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Nuevo crédito</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="border-b border-zinc-200/80 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/25 md:px-6 md:py-4">
          <div
            className={cn(
              'casa-artesanal-preserve-surface flex min-h-11 flex-nowrap items-stretch overflow-hidden rounded-2xl border border-zinc-300/95 bg-white shadow-sm ring-1 ring-zinc-200/90 transition-[box-shadow,border-color,ring-color]',
              'divide-x divide-zinc-200/85 dark:divide-zinc-600/90 dark:border-zinc-600 dark:bg-zinc-900/75 dark:ring-zinc-700/85',
              'focus-within:border-violet-400/55 focus-within:shadow-md focus-within:ring-2 focus-within:ring-violet-500/25 dark:focus-within:border-violet-500/45 dark:focus-within:ring-violet-400/20'
            )}
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-violet-700 dark:text-violet-300"
                strokeWidth={2}
                aria-hidden
              />
              <input
                type="search"
                placeholder="Buscar por cliente o factura…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Buscar créditos"
                className="h-11 w-full min-w-0 border-0 bg-transparent py-2 pl-10 pr-10 text-sm font-medium text-zinc-900 placeholder:font-normal placeholder:text-zinc-500 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setCurrentPage(1)
                  }}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
            <div className="relative flex shrink-0 items-stretch bg-transparent">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(1)
                }}
                aria-label="Filtrar por estado del crédito"
                className="h-11 min-w-[10.25rem] max-w-[46vw] cursor-pointer appearance-none border-0 bg-transparent py-2 pl-3 pr-9 text-sm font-medium text-zinc-900 focus:outline-none dark:text-zinc-100 sm:min-w-[12.5rem] sm:max-w-none"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
                <option value="completed">Completado</option>
                <option value="overdue">Vencido</option>
                <option value="cancelled">Anulado</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/80 dark:text-teal-400/90"
                aria-hidden
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando créditos…</p>
            </div>
          ) : filteredCredits.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <CreditCard className={cn('h-7 w-7', heroIconClass)} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                No hay créditos que coincidan
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Prueba otra búsqueda o crea un crédito con{' '}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Nuevo crédito</span>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1 bg-zinc-50/50 p-3 dark:bg-zinc-950/20 lg:hidden">
                {paginatedCredits.map((credit, index) => {
                  const displayStatus = getConsolidatedCreditDisplayStatus(credit)
                  const globalIndex = startIndex + index
                  return (
                    <div
                      key={credit.id}
                      role="button"
                      tabIndex={0}
                      className="casa-artesanal-preserve-surface w-full cursor-pointer rounded-2xl border-0 bg-transparent p-4 text-left shadow-none transition-colors hover:bg-white/75 dark:hover:bg-zinc-900/45"
                      onClick={() => openClient(credit)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openClient(credit)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          <UserAvatar
                            name={credit.clientName}
                            seed={credit.clientId}
                            size="xs"
                            className="shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs text-zinc-400">#{globalIndex + 1}</span>
                              <span className="font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                {credit.invoiceNumber}
                              </span>
                            </div>
                            <p className="mt-1 truncate font-medium text-zinc-900 dark:text-zinc-50">
                              {credit.clientName}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            badgeTint,
                            'shrink-0 border-0 px-2 py-0.5 text-[11px] font-normal',
                            creditStatusBadgeClass(displayStatus, credit)
                          )}
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(displayStatus, credit)}
                            {creditStatusLabel(displayStatus, credit)}
                          </span>
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-3 text-left dark:border-zinc-800">
                        <div>
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            Total
                          </dt>
                          <dd className="mt-0.5 text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                            {formatCurrency(credit.totalAmount)}
                          </dd>
                        </div>
                        <div className="text-right">
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            Pendiente
                          </dt>
                          <dd
                            className={cn(
                              'mt-0.5 text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100',
                              credit.pendingAmount === 0 && 'text-zinc-500 dark:text-zinc-500'
                            )}
                          >
                            {formatCurrency(credit.pendingAmount)}
                          </dd>
                        </div>
                      </dl>
                      {credit.dueDate && displayStatus !== 'completed' && (
                        <div className="mt-2 flex items-center justify-between border-t border-zinc-200/80 pt-2 text-xs dark:border-zinc-800">
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Calendar className="h-3 w-3 shrink-0" />
                            Vence
                          </span>
                          <span className={getDueDateClass(credit.dueDate)}>{formatDate(credit.dueDate)}</span>
                        </div>
                      )}
                      <div className="mt-2 flex justify-end border-t border-zinc-200/80 pt-2 dark:border-zinc-800">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                          onClick={e => {
                            e.stopPropagation()
                            onView(credit)
                          }}
                          title="Ver cliente"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className={cn(thClass, 'pl-4')}>Cliente</th>
                        <th className={thClass}>Facturas</th>
                        <th className={cn(thClass, 'text-right')}>Total</th>
                        <th className={cn(thClass, 'text-right')}>Pendiente</th>
                        <th className={cn(thClass, 'text-center')}>Estado</th>
                        <th className={thClass}>Vencimiento</th>
                        <th className={cn(thClass, 'w-12 px-2')} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {paginatedCredits.map(credit => {
                        const displayStatus = getConsolidatedCreditDisplayStatus(credit)
                        return (
                        <tr
                          key={credit.id}
                          className="casa-artesanal-preserve-surface cursor-pointer transition-colors hover:bg-zinc-100/90 dark:hover:bg-zinc-800/40"
                          onClick={() => openClient(credit)}
                        >
                          <td className="max-w-[16rem] px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                            <div className="flex min-w-0 items-center gap-2">
                              <UserAvatar
                                name={credit.clientName}
                                seed={credit.clientId}
                                size="xs"
                                className="shrink-0"
                              />
                              <span className="line-clamp-2 min-w-0" title={credit.clientName}>
                                {credit.clientName}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                            {credit.invoiceNumber}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                            {formatCurrency(credit.totalAmount)}
                          </td>
                          <td
                            className={cn(
                              'whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100',
                              credit.pendingAmount === 0 && 'text-zinc-500 dark:text-zinc-500'
                            )}
                          >
                            {formatCurrency(credit.pendingAmount)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                badgeTint,
                                'inline-flex border-0 px-2 py-0.5 text-[11px] font-normal',
                                creditStatusBadgeClass(displayStatus, credit)
                              )}
                            >
                              <span className="flex items-center justify-center gap-1">
                                {getStatusIcon(displayStatus, credit)}
                                {creditStatusLabel(displayStatus, credit)}
                              </span>
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {credit.dueDate ? (
                              <span className={getDueDateClass(credit.dueDate)}>{formatDate(credit.dueDate)}</span>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>
                          <td className="px-1 py-2" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                              onClick={() => onView(credit)}
                              title="Ver cliente"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-3 border-t border-zinc-200 px-3 py-4 dark:border-zinc-800 md:px-6">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[10rem] text-center text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

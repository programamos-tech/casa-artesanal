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
  RefreshCcw,
  ChevronLeft,
  ChevronRight
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
      <Card className={cardShell}>
        <CardHeader className="space-y-0 p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <CreditCard
                  className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span>Gestión de créditos</span>
                <StoreBadge />
              </CardTitle>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Administra créditos y pagos pendientes por cliente
              </p>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-1 text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Deuda total:{' '}
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(totalDebt)}
                  </span>
                </span>
                {todayPaymentsTotal !== undefined && (
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Otorgado hoy:{' '}
                    <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
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
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden md:inline">Actualizar</span>
                </Button>
              )}
              <Button onClick={onCreate} size="sm" className="flex-1 sm:flex-none">
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Nuevo crédito</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className={cardShell}>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-4">
            <div className="relative flex-1 md:h-11 md:min-h-[2.75rem] md:overflow-hidden md:rounded-xl md:border md:border-zinc-200 md:bg-white md:shadow-sm dark:md:border-zinc-700 dark:md:bg-zinc-950">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400 md:left-3" />
              <input
                type="text"
                placeholder="Buscar por cliente o factura…"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-11 w-full min-w-0 rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20 md:h-full md:rounded-none md:border-0 md:focus-visible:ring-inset md:focus-visible:ring-2 md:focus-visible:ring-zinc-400/35 dark:md:bg-transparent dark:md:focus-visible:ring-zinc-500/30"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="h-11 shrink-0 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-zinc-500/20 md:w-52"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="partial">Parcial</option>
              <option value="completed">Completado</option>
              <option value="overdue">Vencido</option>
              <option value="cancelled">Anulado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className={cn('overflow-hidden', cardShell)}>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando créditos…</p>
            </div>
          ) : filteredCredits.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-600">
                <CreditCard className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
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
              <div className="space-y-2 p-3 lg:hidden">
                {paginatedCredits.map((credit, index) => {
                  const displayStatus = getConsolidatedCreditDisplayStatus(credit)
                  const globalIndex = startIndex + index
                  return (
                    <div
                      key={credit.id}
                      role="button"
                      tabIndex={0}
                      className="w-full cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 text-left transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-800/40"
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
                            'shrink-0 border px-2 py-0.5 text-[11px] font-normal',
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
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Cliente
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Facturas
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Total
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Pendiente
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Estado
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Vencimiento
                        </th>
                        <th className="w-12 bg-zinc-50/80 px-2 py-3 dark:bg-zinc-900/50" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {paginatedCredits.map(credit => {
                        const displayStatus = getConsolidatedCreditDisplayStatus(credit)
                        return (
                        <tr
                          key={credit.id}
                          className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/25"
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
                                'inline-flex border px-2 py-0.5 text-[11px] font-normal',
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
                <div className="flex flex-wrap items-center justify-center gap-3 border-t border-zinc-100 px-3 py-4 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
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
                    disabled={currentPage === totalPages}
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

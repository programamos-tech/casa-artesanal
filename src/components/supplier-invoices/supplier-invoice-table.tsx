'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Plus,
  Search,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  Building2
} from 'lucide-react'
import { SupplierInvoice } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'

function getStatusIcon(status: string) {
  switch (status) {
    case 'paid':
      return (
        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400/95" strokeWidth={2} />
      )
    case 'partial':
      return (
        <Clock className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400/90" strokeWidth={2} />
      )
    case 'pending':
      return (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400/95" strokeWidth={2} />
      )
    case 'cancelled':
      return (
        <XCircle className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-rose-400/85" strokeWidth={2} />
      )
    default:
      return (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400/95" strokeWidth={2} />
      )
  }
}

/** Badges con tinte semántico muy suave (marca oscura + acentos discretos) */
function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'pending':
      return 'border-amber-500/35 bg-amber-500/[0.07] text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/[0.08] dark:text-amber-200/95'
    case 'partial':
      return 'border-orange-500/35 bg-orange-500/[0.07] text-orange-950 dark:border-orange-500/28 dark:bg-orange-500/[0.08] dark:text-orange-200/95'
    case 'paid':
      return 'border-emerald-500/35 bg-emerald-500/[0.07] text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/[0.08] dark:text-emerald-200/95'
    case 'cancelled':
      return 'border-rose-500/30 bg-rose-500/[0.06] text-rose-900 dark:border-zinc-600 dark:bg-rose-950/35 dark:text-rose-200/90'
    default:
      return 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'partial':
      return 'Parcial'
    case 'paid':
      return 'Pagada'
    case 'cancelled':
      return 'Anulada'
    default:
      return status
  }
}

interface SupplierInvoiceTableProps {
  invoices: SupplierInvoice[]
  suppliers: { id: string; name: string }[]
  onView: (inv: SupplierInvoice) => void
  onCreate: () => void
  canCreate?: boolean
  isLoading?: boolean
  onRefresh?: () => void
  /**
   * `embedded`: sin tarjeta de título/resumen; sin columna ni filtro de proveedor (vista dentro de un proveedor).
   */
  variant?: 'default' | 'embedded'
}

export function SupplierInvoiceTable({
  invoices,
  suppliers,
  onView,
  onCreate,
  canCreate = true,
  isLoading = false,
  onRefresh,
  variant = 'default',
}: SupplierInvoiceTableProps) {
  const embedded = variant === 'embedded'
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSupplierId, setFilterSupplierId] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString + (dateString.length <= 10 ? 'T12:00:00' : '')).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })

  /** Hora en que se registró la factura en el sistema (para orientarse cuando varias comparten la misma fecha de emisión). */
  const formatRegisteredTime = (createdAtIso: string) =>
    new Date(createdAtIso).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })

  const formatIssueDateAndTime = (inv: SupplierInvoice) =>
    `${formatDate(inv.issueDate)} · ${formatRegisteredTime(inv.createdAt)}`

  const pendingTotal = useMemo(
    () =>
      invoices
        .filter((i) => i.status !== 'cancelled' && i.status !== 'paid')
        .reduce((sum, i) => sum + Math.max(0, i.totalAmount - i.paidAmount), 0),
    [invoices]
  )

  const filteredSorted = useMemo(() => {
    const list = invoices.filter((inv) => {
      const name = (inv.supplierName || '').toLowerCase()
      const num = inv.invoiceNumber.toLowerCase()
      const q = searchTerm.toLowerCase()
      const matchesSearch = embedded
        ? !q || num.includes(q)
        : !q || name.includes(q) || num.includes(q)
      const matchesStatus = filterStatus === 'all' || inv.status === filterStatus
      const matchesSupplier =
        embedded || filterSupplierId === 'all' || inv.supplierId === filterSupplierId
      return matchesSearch && matchesStatus && matchesSupplier
    })
    list.sort((a, b) => {
      const tb = new Date(b.createdAt).getTime()
      const ta = new Date(a.createdAt).getTime()
      if (tb !== ta) return tb - ta
      return b.id.localeCompare(a.id)
    })
    return list
  }, [invoices, searchTerm, filterStatus, filterSupplierId, embedded])

  const totalPages = Math.ceil(filteredSorted.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginated = filteredSorted.slice(startIndex, startIndex + itemsPerPage)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {!embedded && (
        <Card className="border-zinc-300 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <CardHeader className="space-y-0 p-4 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-1.5">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 md:text-xl dark:text-zinc-50">
                  <FileText
                    className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500"
                    aria-hidden
                  />
                  <span>Facturas de proveedores</span>
                  <StoreBadge />
                </CardTitle>
                <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Cuentas por pagar: registra facturas recibidas y abonos al proveedor
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 lg:hidden">
                  <span className="text-zinc-500">Por pagar</span>{' '}
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(pendingTotal)}
                  </span>
                </p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-end lg:w-auto lg:min-w-[12rem]">
                <div className="hidden text-right lg:block">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    Total por pagar
                  </div>
                  <div className="mt-0.5 text-2xl font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
                    {formatCurrency(pendingTotal)}
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
                  {canCreate && (
                    <Button onClick={onCreate} size="sm" className="flex-1 sm:flex-none">
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span className="hidden sm:inline">Nueva factura</span>
                      <span className="sm:hidden">Nueva</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card className="border-zinc-300 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-2 md:h-11 md:min-h-[2.75rem] md:flex-row md:gap-0 md:overflow-hidden md:rounded-xl md:border md:border-zinc-300 md:bg-white md:shadow-sm dark:md:border-zinc-700 dark:md:bg-zinc-950">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder={embedded ? 'Buscar por factura…' : 'Buscar por proveedor o factura...'}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20 md:h-full md:rounded-none md:border-0 md:focus-visible:ring-inset md:focus-visible:ring-2 md:focus-visible:ring-zinc-400/35 dark:md:bg-transparent dark:md:focus-visible:ring-zinc-500/30"
              />
            </div>
            <div
              className={
                embedded
                  ? 'md:contents'
                  : 'grid grid-cols-1 gap-2 sm:grid-cols-2 md:contents'
              }
            >
              {!embedded && (
                <select
                  value={filterSupplierId}
                  onChange={(e) => {
                    setFilterSupplierId(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-9 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20 md:h-full md:w-[min(18rem,32vw)] md:min-w-[14rem] md:shrink-0 md:rounded-none md:border-0 md:border-l md:border-zinc-300 md:focus-visible:ring-inset md:focus-visible:ring-2 md:focus-visible:ring-zinc-400/35 dark:md:bg-zinc-950 dark:md:border-zinc-700 dark:md:focus-visible:ring-zinc-500/30"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.65rem center',
                    backgroundSize: '1rem',
                  }}
                >
                  <option value="all">Todos los proveedores</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-11 w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-zinc-300 bg-white px-3 py-2 pr-9 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20 md:h-full md:w-44 md:shrink-0 md:rounded-none md:border-0 md:border-l md:border-zinc-300 md:focus-visible:ring-inset md:focus-visible:ring-2 md:focus-visible:ring-zinc-400/35 dark:md:bg-zinc-950 dark:md:border-zinc-700 dark:md:focus-visible:ring-zinc-500/30"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.65rem center',
                  backgroundSize: '1rem'
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
                <option value="paid">Pagada</option>
                <option value="cancelled">Anulada</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-zinc-300 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando facturas…</p>
            </div>
          ) : filteredSorted.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-600">
                <FileText className="h-5 w-5 text-zinc-400" />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">No hay facturas</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Registra la primera factura con <span className="font-medium text-zinc-700 dark:text-zinc-300">Nueva factura</span>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 p-3 md:hidden">
                {paginated.map((inv) => {
                  const pending = Math.max(0, inv.totalAmount - inv.paidAmount)
                  return (
                    <button
                      type="button"
                      key={inv.id}
                      className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 p-4 text-left transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-800/40"
                      onClick={() => onView(inv)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {embedded ? (
                            <>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                                <span className="truncate font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {inv.invoiceNumber}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Emisión {formatIssueDateAndTime(inv)}
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 shrink-0 text-zinc-400" />
                                <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                                  {inv.supplierName || 'Proveedor'}
                                </span>
                              </div>
                              <p className="mt-1 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                {inv.invoiceNumber}
                              </p>
                            </>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`shrink-0 border px-2 py-0.5 text-[11px] font-normal ${getStatusBadgeClass(inv.status)}`}
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(inv.status)}
                            {getStatusLabel(inv.status)}
                          </span>
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-zinc-300 pt-3 text-left dark:border-zinc-800">
                        <div>
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            {embedded ? 'Total' : 'Emisión'}
                          </dt>
                          <dd className="mt-0.5 text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                            {embedded ? formatCurrency(inv.totalAmount) : formatIssueDateAndTime(inv)}
                          </dd>
                        </div>
                        <div className="text-right">
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Pendiente</dt>
                          <dd
                            className={`mt-0.5 text-sm tabular-nums font-medium ${pending > 0 ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'}`}
                          >
                            {formatCurrency(pending)}
                          </dd>
                        </div>
                      </dl>
                    </button>
                  )
                })}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table
                    className={`w-full border-collapse text-sm ${embedded ? 'min-w-[640px]' : 'min-w-[720px]'}`}
                  >
                    <thead>
                      <tr className="border-b border-zinc-300 dark:border-zinc-800">
                        {!embedded && (
                          <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                            Proveedor
                          </th>
                        )}
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Factura
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Emisión · hora
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Total
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Pagado
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Pendiente
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Estado
                        </th>
                        <th className="w-12 bg-zinc-50/80 px-2 py-3 dark:bg-zinc-900/50" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {paginated.map((inv) => {
                        const pending = Math.max(0, inv.totalAmount - inv.paidAmount)
                        return (
                          <tr
                            key={inv.id}
                            className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/25"
                            onClick={() => onView(inv)}
                          >
                            {!embedded && (
                              <td className="max-w-[10rem] truncate px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                                {inv.supplierName || '—'}
                              </td>
                            )}
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                              {inv.invoiceNumber}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                              <span className="tabular-nums">{formatIssueDateAndTime(inv)}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                              {formatCurrency(inv.totalAmount)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                              {formatCurrency(inv.paidAmount)}
                            </td>
                            <td
                              className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${pending > 0 ? 'font-medium text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-500'}`}
                            >
                              {formatCurrency(pending)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant="outline"
                                className={`inline-flex border px-2 py-0.5 text-[11px] font-normal ${getStatusBadgeClass(inv.status)}`}
                              >
                                <span className="flex items-center justify-center gap-1">
                                  {getStatusIcon(inv.status)}
                                  {getStatusLabel(inv.status)}
                                </span>
                              </Badge>
                            </td>
                            <td className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                onClick={() => onView(inv)}
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
                <div className="flex items-center justify-center gap-3 border-t border-zinc-300 py-4 dark:border-zinc-800">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="border-zinc-300 dark:border-zinc-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[4rem] text-center text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className="border-zinc-300 dark:border-zinc-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

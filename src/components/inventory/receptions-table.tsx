'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRightLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Search,
  Store as StoreIcon,
} from 'lucide-react'
import { StoreBadge } from '@/components/ui/store-badge'
import { Sale, StoreStockTransfer } from '@/types'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

function transferStatusBadge(status: string) {
  switch (status) {
    case 'pending':
    case 'in_transit':
      return 'border-amber-500/25 bg-amber-500/[0.08] text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200'
    case 'received':
      return 'border-brand-500/25 bg-brand-500/[0.08] text-brand-900 dark:border-brand-500/30 dark:bg-brand-950/40 dark:text-brand-200'
    case 'partially_received':
      return 'border-orange-500/25 bg-orange-500/[0.08] text-orange-900 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200'
    case 'cancelled':
      return 'border-rose-500/30 bg-rose-500/[0.08] text-rose-900 dark:border-rose-500/35 dark:bg-rose-950/40 dark:text-rose-200'
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
}

function transferStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'in_transit':
      return 'En tránsito'
    case 'received':
      return 'Recibida'
    case 'partially_received':
      return 'Parcial'
    case 'cancelled':
      return 'Cancelada'
    default:
      return status
  }
}

function alnum(s: string) {
  return s.replace(/[^a-z0-9]/gi, '')
}

function filterTransfersBySearch(
  list: StoreStockTransfer[],
  transferSales: Map<string, Sale>,
  raw: string
): StoreStockTransfer[] {
  const q = raw.trim().toLowerCase()
  if (!q) return list
  const qCompact = alnum(q)
  return list.filter(t => {
    if (t.transferNumber?.toLowerCase().includes(q)) return true
    if (t.id.toLowerCase().includes(q)) return true
    if (t.fromStoreName?.toLowerCase().includes(q)) return true
    if (t.toStoreName?.toLowerCase().includes(q)) return true
    if (t.fromStoreId.toLowerCase().includes(q)) return true
    if (t.toStoreId.toLowerCase().includes(q)) return true
    const sale = transferSales.get(t.id)
    if (sale) {
      if (sale.id.toLowerCase().includes(q)) return true
      if (sale.invoiceNumber?.toLowerCase().includes(q)) return true
      if (qCompact.length >= 3) {
        if (alnum(sale.invoiceNumber || '').includes(qCompact)) return true
        if (alnum(sale.id).includes(qCompact)) return true
      }
    }
    return false
  })
}

const searchInputClass =
  'w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 md:py-2.5 md:pl-10 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/25'

const statusSelectClass =
  'w-full shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 md:py-2.5 sm:w-[min(280px,28%)] sm:min-w-[200px] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/25'

function canReceiveTransfer(t: StoreStockTransfer) {
  return t.status === 'pending' || t.status === 'in_transit'
}

export interface ReceptionsTableProps {
  filter: 'all' | 'pending' | 'received'
  onFilterChange: (f: 'all' | 'pending' | 'received') => void
  onRefresh: () => void
  loading: boolean
  transferSales: Map<string, Sale>
  loadingSalesForList: boolean
  pendingTransfers: StoreStockTransfer[]
  receivedTransfers: StoreStockTransfer[]
  pendingPage: number
  receivedPage: number
  pendingTotal: number
  receivedTotal: number
  pendingHasMore: boolean
  receivedHasMore: boolean
  pageSize: number
  onPendingPageChange: (p: number) => void
  onReceivedPageChange: (p: number) => void
  onReceive: (t: StoreStockTransfer) => void
  onViewTransfer: (t: StoreStockTransfer) => void
  onOpenSale: (saleId: string) => void
}

export function ReceptionsTable({
  filter,
  onFilterChange,
  onRefresh,
  loading,
  transferSales,
  loadingSalesForList,
  pendingTransfers,
  receivedTransfers,
  pendingPage,
  receivedPage,
  pendingTotal,
  receivedTotal,
  pendingHasMore,
  receivedHasMore,
  pageSize,
  onPendingPageChange,
  onReceivedPageChange,
  onReceive,
  onViewTransfer,
  onOpenSale,
}: ReceptionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPending = useMemo(
    () => filterTransfersBySearch(pendingTransfers, transferSales, searchTerm),
    [pendingTransfers, transferSales, searchTerm]
  )
  const filteredReceived = useMemo(
    () => filterTransfersBySearch(receivedTransfers, transferSales, searchTerm),
    [receivedTransfers, transferSales, searchTerm]
  )

  const hasActiveSearch = searchTerm.trim().length > 0

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString)
    return {
      date: format(d, 'dd/MM/yyyy', { locale: es }),
      time: format(d, 'HH:mm', { locale: es }),
    }
  }

  const totalQty = (t: StoreStockTransfer) =>
    t.items && t.items.length > 0
      ? t.items.reduce((sum, item) => sum + item.quantity, 0)
      : t.quantity || 0

  const saleCell = (t: StoreStockTransfer) => {
    const isFromMain = t.fromStoreId === MAIN_STORE_ID
    if (!isFromMain) {
      return <span className="text-xs text-zinc-400">—</span>
    }
    if (loadingSalesForList) {
      return <span className="text-xs text-zinc-400">…</span>
    }
    const sale = transferSales.get(t.id)
    if (!sale) {
      return <span className="text-xs text-zinc-400">—</span>
    }
    return (
      <button
        type="button"
        className="text-left font-mono text-xs text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
        onClick={e => {
          e.stopPropagation()
          onOpenSale(sale.id)
        }}
      >
        <span className="font-semibold">{sale.invoiceNumber || `Venta`}</span>
        <span className="mt-0.5 block text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
          ID {sale.id.slice(0, 8)}…
        </span>
      </button>
    )
  }

  const displayDate = (t: StoreStockTransfer, kind: 'pending' | 'received') => {
    if (kind === 'received' && (t.status === 'received' || t.status === 'partially_received') && t.receivedAt) {
      return formatDateTime(t.receivedAt)
    }
    return formatDateTime(t.createdAt)
  }

  const renderPagination = (
    currentPage: number,
    total: number,
    hasMore: boolean,
    onPageChange: (p: number) => void
  ) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    if (total <= pageSize) return null
    if (hasActiveSearch) return null

    return (
      <div className="flex flex-wrap items-center justify-center gap-1 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="flex h-9 w-9 items-center justify-center rounded border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:h-7 sm:w-7"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
            .map((page, index, array) => {
              const showEllipsis = index > 0 && page - array[index - 1] > 1
              return (
                <div key={page} className="flex items-center">
                  {showEllipsis && <span className="px-1 text-xs text-zinc-400">…</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    disabled={loading}
                    className={cn(
                      'h-9 min-w-[36px] rounded border px-2 text-xs transition-colors sm:h-7 sm:min-w-[28px]',
                      page === currentPage
                        ? 'border-zinc-300 bg-zinc-100 font-medium text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    )}
                  >
                    {page}
                  </button>
                </div>
              )
            })}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || !hasMore || loading}
          className="flex h-9 w-9 items-center justify-center rounded border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:h-7 sm:w-7"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const renderTableBlock = (
    list: StoreStockTransfer[],
    filteredList: StoreStockTransfer[],
    kind: 'pending' | 'received',
    sectionTitle: string,
    emptyTitle: string,
    emptyDescription: string,
    currentPage: number,
    total: number,
    hasMore: boolean,
    onPageChange: (p: number) => void
  ) => {
    const showEmpty = list.length === 0 && !loading
    const showNoSearchHits = list.length > 0 && filteredList.length === 0 && hasActiveSearch

    return (
      <div className="space-y-3">
        {filter === 'all' && (
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {sectionTitle}
          </h3>
        )}
        {showEmpty ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
            <h4 className="mb-1 text-base font-medium text-zinc-900 dark:text-zinc-50">{emptyTitle}</h4>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyDescription}</p>
          </div>
        ) : showNoSearchHits ? (
          <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center dark:border-zinc-800">
            <Search className="mx-auto mb-2 h-10 w-10 text-zinc-400 opacity-80" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin coincidencias en {sectionTitle.toLowerCase()}</p>
          </div>
        ) : (
          <>
            {hasActiveSearch && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                {filteredList.length} coincidencia{filteredList.length !== 1 ? 's' : ''} en {sectionTitle.toLowerCase()}
              </div>
            )}
            <div className="space-y-2 p-3 md:hidden">
              {filteredList.map(t => {
                const { date, time } = displayDate(t, kind)
                const recv = canReceiveTransfer(t)
                return (
                  <div
                    key={t.id}
                    className="w-full rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 text-left dark:border-zinc-800 dark:bg-zinc-950/30"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="w-full cursor-pointer text-left"
                      onClick={() => onViewTransfer(t)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onViewTransfer(t)
                        }
                      }}
                    >
                      <div className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {t.transferNumber || `#${t.id.slice(0, 8)}`}
                      </div>
                      {t.fromStoreId === MAIN_STORE_ID && transferSales.get(t.id) && (
                        <span
                          role="link"
                          tabIndex={0}
                          className="mt-1 block text-left text-[11px] font-mono text-zinc-500 underline-offset-2 hover:underline"
                          onClick={e => {
                            e.stopPropagation()
                            const s = transferSales.get(t.id)
                            if (s) onOpenSale(s.id)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation()
                              e.preventDefault()
                              const s = transferSales.get(t.id)
                              if (s) onOpenSale(s.id)
                            }
                          }}
                        >
                          Venta: {transferSales.get(t.id)?.invoiceNumber ?? transferSales.get(t.id)?.id.slice(0, 8)}
                        </span>
                      )}
                      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-3 text-left dark:border-zinc-800">
                        <div>
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Desde</dt>
                          <dd className="mt-0.5 text-xs text-zinc-800 dark:text-zinc-200">{t.fromStoreName || '—'}</dd>
                        </div>
                        <div className="text-right">
                          <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Fecha</dt>
                          <dd className="mt-0.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
                            {date} {time}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-2">
                        <Badge className={cn('text-[11px]', transferStatusBadge(t.status))}>
                          {transferStatusLabel(t.status)}
                        </Badge>
                      </div>
                    </div>
                    {recv && (
                      <Button className="mt-3 w-full" size="sm" type="button" onClick={() => onReceive(t)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Recibir
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1020px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                      Transferencia
                    </th>
                    <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                      Venta / ID
                    </th>
                    <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                      Desde
                    </th>
                    <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                      Hacia
                    </th>
                    <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                      Unidades
                    </th>
                    <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                      Estado
                    </th>
                    <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                      {kind === 'received' ? 'Recibida' : 'Enviada'}
                    </th>
                    <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredList.map(t => {
                    const { date, time } = displayDate(t, kind)
                    const recv = canReceiveTransfer(t)
                    return (
                      <tr
                        key={t.id}
                        className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/25"
                        onClick={() => onViewTransfer(t)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
                          {t.transferNumber || `#${t.id.slice(0, 8)}`}
                        </td>
                        <td className="max-w-[12rem] px-4 py-3" onClick={e => e.stopPropagation()}>
                          {saleCell(t)}
                        </td>
                        <td className="max-w-[10rem] px-4 py-3 text-zinc-800 dark:text-zinc-200">
                          <span className="flex items-center gap-1.5">
                            <StoreIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            <span className="line-clamp-2">{t.fromStoreName || '—'}</span>
                          </span>
                        </td>
                        <td className="max-w-[10rem] px-4 py-3 text-zinc-800 dark:text-zinc-200">
                          <span className="flex items-center gap-1.5">
                            <StoreIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            <span className="line-clamp-2">{t.toStoreName || '—'}</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                          {totalQty(t)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={cn('inline-flex w-fit text-[11px]', transferStatusBadge(t.status))}>
                            {transferStatusLabel(t.status)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                          <div className="text-sm tabular-nums">{date}</div>
                          <div className="text-xs text-zinc-500">{time}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          {recv ? (
                            <Button size="sm" type="button" onClick={() => onReceive(t)}>
                              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                              Recibir
                            </Button>
                          ) : (
                            <Button size="sm" type="button" variant="outline" onClick={() => onViewTransfer(t)}>
                              Ver
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {renderPagination(currentPage, total, hasMore, onPageChange)}
          </>
        )}
      </div>
    )
  }

  const showPendingSection = filter !== 'received'
  const showReceivedSection = filter !== 'pending'

  const loadingOnly = loading && pendingTransfers.length === 0 && receivedTransfers.length === 0

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className={cardShell}>
        <CardHeader className="space-y-0 p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <ArrowRightLeft className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} aria-hidden />
                <span>Recepción de Transferencias</span>
                <StoreBadge />
              </CardTitle>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Recibe y confirma las transferencias de productos enviadas a tu tienda
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <Button onClick={onRefresh} variant="outline" size="sm" className="flex-1 sm:flex-none" disabled={loading}>
                <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">Actualizar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className={cardShell}>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:gap-4">
            <div className="relative min-w-0 w-full flex-1 sm:min-w-0">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 md:left-3"
                aria-hidden
              />
              <input
                type="search"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por ID de venta o tienda…"
                className={searchInputClass}
                aria-label="Buscar transferencias por venta o tienda"
              />
            </div>
            <select
              value={filter}
              onChange={e => onFilterChange(e.target.value as typeof filter)}
              className={statusSelectClass}
              aria-label="Filtrar listado"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="received">Completadas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className={cn('overflow-hidden', cardShell)}>
        <CardContent className="p-0">
          {loadingOnly ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando transferencias…</p>
            </div>
          ) : (
            <div className="space-y-8 p-3 md:p-4">
              {showPendingSection &&
                renderTableBlock(
                  pendingTransfers,
                  filteredPending,
                  'pending',
                  'Pendientes de recepción',
                  'No hay transferencias pendientes',
                  'Todas las transferencias entrantes han sido recibidas',
                  pendingPage,
                  pendingTotal,
                  pendingHasMore,
                  onPendingPageChange
                )}
              {showReceivedSection &&
                renderTableBlock(
                  receivedTransfers,
                  filteredReceived,
                  'received',
                  'Historial recibidas',
                  'No hay transferencias recibidas',
                  'Aún no hay recepciones completadas para mostrar',
                  receivedPage,
                  receivedTotal,
                  receivedHasMore,
                  onReceivedPageChange
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

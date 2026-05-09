'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
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

export interface TransfersTableProps {
  transfers: StoreStockTransfer[]
  transferSales: Map<string, Sale>
  loadingSalesForList: boolean
  filter: 'all' | 'pending' | 'cancelled' | 'received'
  onFilterChange: (f: 'all' | 'pending' | 'cancelled' | 'received') => void
  onRefresh: () => void
  onCreate?: () => void
  canManageAllStores: boolean
  onView: (transfer: StoreStockTransfer) => void
  onOpenSale: (saleId: string) => void
  loading: boolean
  currentPage: number
  totalTransfers: number
  pageSize: number
  onPageChange: (page: number) => void
}

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

/** Búsqueda local sobre la página actual: TRF, UUID transferencia, tienda (nombre o id), venta (id o factura). */
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

export function TransfersTable({
  transfers,
  transferSales,
  loadingSalesForList,
  filter,
  onFilterChange,
  onRefresh,
  onCreate,
  canManageAllStores,
  onView,
  onOpenSale,
  loading,
  currentPage,
  totalTransfers,
  pageSize,
  onPageChange,
}: TransfersTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const displayedTransfers = useMemo(
    () => filterTransfersBySearch(transfers, transferSales, searchTerm),
    [transfers, transferSales, searchTerm]
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

  const totalPages = Math.max(1, Math.ceil(totalTransfers / pageSize))

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

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className={cardShell}>
        <CardHeader className="space-y-0 p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <ArrowRightLeft
                  className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span>Transferencias de Inventario</span>
                <StoreBadge />
              </CardTitle>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Gestiona las transferencias de productos entre tiendas
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <Button onClick={onRefresh} variant="outline" size="sm" className="flex-1 sm:flex-none" disabled={loading}>
                <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">Actualizar</span>
              </Button>
              {canManageAllStores && onCreate && (
                <Button onClick={onCreate} size="sm" className="flex-1 sm:flex-none">
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Nueva Transferencia</span>
                  <span className="sm:hidden">Nueva</span>
                </Button>
              )}
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
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="received">Recibidas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className={cn('overflow-hidden', cardShell)}>
        <CardContent className="p-0">
          {loading && transfers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando transferencias…</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
              <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">No hay transferencias</h3>
              <p className="text-zinc-500 dark:text-zinc-400">
                {canManageAllStores
                  ? 'Crea una nueva transferencia para comenzar'
                  : 'No hay transferencias en este filtro'}
              </p>
            </div>
          ) : displayedTransfers.length === 0 && hasActiveSearch ? (
            <div className="py-12 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-zinc-400 opacity-80" />
              <h3 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-50">Sin coincidencias</h3>
              <p className="text-zinc-500 dark:text-zinc-400">
                Prueba otro término o cambia de página si la transferencia está en otro lote.
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setSearchTerm('')}>
                Limpiar búsqueda
              </Button>
            </div>
          ) : (
            <>
              {hasActiveSearch && (
                <div className="border-b border-zinc-200 bg-zinc-50/70 px-4 py-2 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                  {displayedTransfers.length} coincidencia
                  {displayedTransfers.length !== 1 ? 's' : ''} en esta página
                  {transfers.length !== displayedTransfers.length
                    ? ` (de ${transfers.length} cargadas)`
                    : ''}
                </div>
              )}
              <div className="space-y-2 p-3 md:hidden">
                {displayedTransfers.map(t => {
                  const { date, time } = formatDateTime(t.createdAt)
                  return (
                    <div
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      className="w-full cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 text-left transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-800/40"
                      onClick={() => onView(t)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onView(t)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            {t.transferNumber || `#${t.id.slice(0, 8)}`}
                          </div>
                          {t.fromStoreId === MAIN_STORE_ID && transferSales.get(t.id) && (
                            <button
                              type="button"
                              className="mt-1 block text-left text-[11px] font-mono text-zinc-500 underline-offset-2 hover:underline"
                              onClick={e => {
                                e.stopPropagation()
                                const s = transferSales.get(t.id)
                                if (s) onOpenSale(s.id)
                              }}
                            >
                              Venta: {transferSales.get(t.id)?.invoiceNumber ?? transferSales.get(t.id)?.id.slice(0, 8)}
                            </button>
                          )}
                          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-3 text-left dark:border-zinc-800">
                            <div>
                              <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Desde → Hacia</dt>
                              <dd className="mt-0.5 text-xs text-zinc-800 dark:text-zinc-200">
                                {t.fromStoreName} → {t.toStoreName}
                              </dd>
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
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] border-collapse text-sm">
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
                          Fecha
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {displayedTransfers.map(t => {
                        const { date, time } = formatDateTime(t.createdAt)
                        return (
                          <tr
                            key={t.id}
                            className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/25"
                            onClick={() => onView(t)}
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
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalTransfers > pageSize && !hasActiveSearch && (
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
                    disabled={currentPage >= totalPages || loading}
                    className="flex h-9 w-9 items-center justify-center rounded border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:h-7 sm:w-7"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
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

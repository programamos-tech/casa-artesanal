'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Plus,
  Printer,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react'
import { Sale, Credit, StoreStockTransfer } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'
import { CreditsService } from '@/lib/credits-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { cn } from '@/lib/utils'
import { SALES_PAGE_SIZE } from '@/lib/sales-service'
import { useSales, type SalesDateRange } from '@/contexts/sales-context'
import { SalesDateRangeFilter } from '@/components/sales/sales-date-range-filter'
import { PaymentMethodLabel } from '@/components/sales/payment-method-label'

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

interface SalesTableProps {
  sales: Sale[]
  loading: boolean
  currentPage: number
  totalSales: number
  hasMore: boolean
  onEdit: (sale: Sale) => void
  onDelete: (sale: Sale) => void
  onView: (sale: Sale) => void
  onCreate: () => void
  onPrint: (sale: Sale) => void
  onPageChange: (page: number) => void
  onSearch: (searchTerm: string) => Promise<Sale[]>
  onRefresh?: () => void
  /** Estado inicial del filtro (ej. draft al volver de “Dejar borrador”). */
  initialStatusFilter?: string
}

export function SalesTable({ 
  sales, 
  loading,
  currentPage,
  totalSales,
  hasMore,
  onEdit, 
  onDelete, 
  onView, 
  onCreate, 
  onPrint,
  onPageChange,
  onSearch,
  onRefresh,
  initialStatusFilter = 'all',
}: SalesTableProps) {
  const { dateRange, setDateRange, clearDateRange } = useSales()
  const hasDateFilter = Boolean(dateRange.start || dateRange.end)
  const { canCreate, currentUser } = usePermissions()
  const canCreateSales = canCreate('sales')
  const roleNorm = (currentUser?.role ?? '').toLowerCase().trim()
  const isVendedorRole = roleNorm === 'vendedor' || roleNorm === 'vendedora'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState(initialStatusFilter || 'all')
  const [searchResults, setSearchResults] = useState<Sale[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [credits, setCredits] = useState<Record<string, Credit>>({})
  const [transfers, setTransfers] = useState<Record<string, StoreStockTransfer>>({})

  useEffect(() => {
    if (initialStatusFilter) setFilterStatus(initialStatusFilter)
  }, [initialStatusFilter])
  useEffect(() => {
    const loadCredits = async () => {
      const creditSales = sales.filter((sale) => sale.paymentMethod === 'credit' && sale.id)
      const creditsToLoad: Record<string, Credit> = {}

      await Promise.all(
        creditSales.map(async (sale) => {
          if (!credits[sale.id]) {
            try {
              const credit = await CreditsService.getCreditBySaleId(sale.id, {
                ignoreStoreFilter: true,
              })
              if (credit) {
                creditsToLoad[sale.id] = credit
              }
            } catch (error) {
              // Error silencioso
            }
          }
        })
      )

      if (Object.keys(creditsToLoad).length > 0) {
        setCredits((prev) => ({ ...prev, ...creditsToLoad }))
      }
    }

    if (sales.length > 0) {
      loadCredits()
    }
  }, [sales])

  // Cargar traslados asociados (por sale_id / heurística). No confundir con método "transferencia".
  useEffect(() => {
    let cancelled = false
    const loadTransfers = async () => {
      if (sales.length === 0) return
      try {
        const map = await StoreStockTransferService.getTransfersBySaleIds(sales.map((s) => s.id))
        if (!cancelled && Object.keys(map).length > 0) {
          setTransfers((prev) => ({ ...prev, ...map }))
        }
      } catch {
        // silencioso
      }
    }
    void loadTransfers()
    return () => {
      cancelled = true
    }
  }, [sales])

  // Función helper para generar ID del crédito
  const getCreditId = (credit: Credit): string => {
    const clientInitials = credit.clientName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
      .padEnd(2, 'X')
    
    const creditSuffix = credit.id.substring(credit.id.length - 6).toLowerCase()
    return `${clientInitials}${creditSuffix}`
  }

  // Función helper para generar ID de la transferencia
  const getTransferId = (transfer: StoreStockTransfer): string => {
    if (transfer.transferNumber) {
      return transfer.transferNumber.replace('TRF-', '')
    }
    // Si no hay transferNumber, usar las últimas 8 letras del ID
    return transfer.id.substring(transfer.id.length - 8).toUpperCase()
  }

  // Verificar si una venta es de transferencia entre tiendas
  // Solo es true si hay una transferencia de stock asociada cargada
  const isTransferSale = (sale: Sale): boolean => {
    return !!transfers[sale.id]
  }

  // Efecto para manejar la búsqueda
  useEffect(() => {
    const handleSearch = async () => {
      if (searchTerm.trim()) {
        setIsSearching(true)
        try {
          const results = await onSearch(searchTerm)
          setSearchResults(results)
        } catch (error) {
      // Error silencioso en producción
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      } else {
        setSearchResults([])
      }
    }

    // Debounce la búsqueda para evitar muchas llamadas
    const timeoutId = setTimeout(handleSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, onSearch, dateRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const dateStr = date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    const timeStr = date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    return { date: dateStr, time: timeStr }
  }

  const generateInvoiceNumber = (sale: Sale) => {
    // Usar el invoiceNumber de la base de datos si existe
    if (sale.invoiceNumber) {
      return sale.invoiceNumber
    }
    // Fallback: usar los últimos 4 caracteres del ID como último recurso
    return `#FV${sale.id.slice(-4)}`
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'pending':
        return 'Pendiente'
      case 'cancelled':
        return 'Anulada'
      case 'draft':
        return 'Borrador'
      default:
        return status
    }
  }

  // Obtener el estado real de la venta (usar estado del crédito si es venta a crédito)
  const getEffectiveStatus = (sale: Sale): string => {
    // Si la venta está cancelada, siempre mostrar como cancelada (sin importar el estado del crédito)
    if (sale.status === 'cancelled') {
      return 'cancelled'
    }
    // Si es una venta a crédito y tiene estado de crédito, usar ese estado
    if (sale.paymentMethod === 'credit' && sale.creditStatus) {
      return sale.creditStatus
    }
    // Si es una venta a crédito completada pero no tiene crédito asociado, considerar como pendiente
    if (sale.paymentMethod === 'credit' && sale.status === 'completed' && !sale.creditStatus) {
      return 'pending'
    }
    return sale.status
  }

  // Obtener el label del estado real
  const getEffectiveStatusLabel = (sale: Sale): string => {
    const effectiveStatus = getEffectiveStatus(sale)
    if (sale.paymentMethod === 'credit' && (effectiveStatus === 'pending' || effectiveStatus === 'partial')) {
      return 'Pendiente'
    }
    if (sale.paymentMethod === 'credit' && effectiveStatus === 'completed') {
      return 'Completada'
    }
    if (sale.paymentMethod === 'credit' && effectiveStatus === 'overdue') {
      return 'Vencida'
    }
    return getStatusLabel(effectiveStatus)
  }

  const getStatusTone = (sale: Sale): ReportTone => {
    const status = getEffectiveStatus(sale)
    if (status === 'completed') return 'success'
    if (status === 'pending' || status === 'partial') return 'warning'
    if (status === 'overdue' || status === 'cancelled') return 'danger'
    if (status === 'draft') return 'info'
    return 'neutral'
  }

  const statuses = ['all', 'completed', 'draft', 'pending', 'cancelled']

  // Usar resultados de búsqueda si hay un término de búsqueda, sino usar todas las ventas
  // Pero si está buscando, no mostrar nada hasta que termine la búsqueda
  const salesToShow = searchTerm.trim() ? (isSearching ? [] : searchResults) : sales
  
  // Eliminar duplicados por ID antes de filtrar
  const uniqueSales = salesToShow.filter((sale, index, self) => 
    index === self.findIndex((s) => s.id === sale.id)
  )
  
  const formatRangeLabel = (range: SalesDateRange) => {
    const fmt = (d: Date) =>
      d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    if (range.start && range.end) {
      const a = range.start <= range.end ? range.start : range.end
      const b = range.end >= range.start ? range.end : range.start
      if (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
      ) {
        return fmt(a)
      }
      return `${a.toLocaleDateString('es-CO')} — ${b.toLocaleDateString('es-CO')}`
    }
    if (range.start) return fmt(range.start)
    if (range.end) return fmt(range.end)
    return ''
  }

  const filteredSales = uniqueSales.filter(sale => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'pending') {
      // Pendientes: ventas a crédito con créditos pendientes o parciales
      if (sale.paymentMethod === 'credit') {
        const effectiveStatus = getEffectiveStatus(sale)
        return effectiveStatus === 'pending' || effectiveStatus === 'partial'
      }
      return false
    }
    if (filterStatus === 'cancelled') {
      // Anuladas: ventas canceladas
      return sale.status === 'cancelled'
    }
    // Para otros estados, usar el filtro normal
    return sale.status === filterStatus
  })

  const daySalesTotal = useMemo(
    () =>
      filteredSales
        .filter(sale => sale.status !== 'cancelled')
        .reduce((sum, sale) => sum + (sale.total || 0), 0),
    [filteredSales]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:items-center sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">Ventas</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {hasDateFilter
              ? `Ventas · ${formatRangeLabel(dateRange)}`
              : 'Facturas de la tienda seleccionada.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className={headerIconBtnClass}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} strokeWidth={1.5} />
            </button>
          )}
          {(canCreateSales || isVendedorRole) && (
            <button type="button" onClick={onCreate} className={headerPrimaryBtnClass}>
              <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Nueva venta
            </button>
          )}
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
            placeholder={isSearching ? 'Buscando…' : 'Buscar factura o cliente…'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            aria-label="Buscar ventas"
            className="h-8 w-full min-w-0 border-0 bg-transparent pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-white/35 [&::-webkit-search-cancel-button]:hidden"
          />
          {isSearching ? (
            <div className="absolute right-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          ) : searchTerm ? (
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
        <div className={cn(filterSelectWrapClass, 'flex items-center')}>
          <SalesDateRangeFilter
            start={dateRange.start}
            end={dateRange.end}
            onStartChange={start => void setDateRange({ start, end: dateRange.end })}
            onEndChange={end => void setDateRange({ start: dateRange.start, end })}
          />
        </div>
        <div className={cn(filterSelectWrapClass, 'min-w-[10.5rem]')}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filtrar por estado de venta"
            className={filterSelectClass}
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all'
                  ? 'Todos los estados'
                  : status === 'pending'
                    ? 'Créditos abiertos'
                    : status === 'cancelled'
                      ? 'Anuladas'
                      : getStatusLabel(status)}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40"
            aria-hidden
          />
        </div>
      </div>

      {hasDateFilter && !isSearching ? (
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-zinc-500 dark:text-white/50">
          <span>
            {filteredSales.length} venta{filteredSales.length !== 1 ? 's' : ''} · {formatCurrency(daySalesTotal)}
          </span>
          <button
            type="button"
            onClick={() => void clearDateRange()}
            className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900 dark:text-white/60 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
            Quitar fechas
          </button>
        </div>
      ) : null}

      <div>
          {isSearching ? (
            <p className="py-14 text-center text-[13px] text-zinc-500 dark:text-white/50">Buscando ventas…</p>
          ) : filteredSales.length === 0 ? (
            <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {searchTerm.trim()
                  ? 'No se encontraron ventas'
                  : hasDateFilter
                    ? 'No hay ventas en este período'
                    : filterStatus !== 'all'
                      ? 'Ninguna factura coincide con este estado'
                      : 'No hay ventas'}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                {searchTerm.trim()
                  ? 'Prueba otra factura o cliente.'
                  : hasDateFilter
                    ? 'Elige otro rango o quita el filtro de fechas.'
                    : filterStatus !== 'all'
                      ? 'Prueba otro estado o busca la factura por número.'
                      : 'Crea una con «Nueva venta».'}
              </p>
            </div>
          ) : (
            <>
              {/* Móvil y tablet: lista compacta; tabla ancha solo desde lg (evita paginación lejos del bottom nav) */}
              <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
                {filteredSales.map(sale => {
                  const { date, time } = formatDateTime(sale.createdAt)
                  return (
                    <div
                      key={sale.id}
                      role="button"
                      tabIndex={0}
                      className="casa-artesanal-preserve-surface flex cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      onClick={() => onView(sale)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onView(sale)
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                              {generateInvoiceNumber(sale)}
                            </span>
                            {sale.paymentMethod === 'credit' && credits[sale.id] && (
                              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                                Crédito #{getCreditId(credits[sale.id])}
                              </span>
                            )}
                            {isTransferSale(sale) && transfers[sale.id] && (
                              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                                TRF {transfers[sale.id].transferNumber || `#${getTransferId(transfers[sale.id])}`}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {sale.clientName}
                          </p>
                          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-3 text-left dark:border-zinc-800">
                            <div>
                              <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Total</dt>
                              <dd className="mt-0.5 text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                                {formatCurrency(sale.total)}
                              </dd>
                            </div>
                            <div className="text-right">
                              <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Fecha</dt>
                              <dd className="mt-0.5 text-xs tabular-nums text-zinc-700 dark:text-zinc-300">
                                {date} {time}
                              </dd>
                            </div>
                          </dl>
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                            <PaymentMethodLabel method={sale.paymentMethod} />
                            <span className="text-zinc-300 dark:text-white/20">·</span>
                            <StatusDot tone={getStatusTone(sale)} />
                            {getEffectiveStatusLabel(sale)}
                          </p>
                        </div>
                        {sale.status !== 'cancelled' && (
                          <button
                            type="button"
                            className={rowIconBtnClass}
                            title="Imprimir"
                            aria-label="Imprimir"
                            onClick={e => {
                              e.stopPropagation()
                              onPrint(sale)
                            }}
                          >
                            <Printer className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
                  <table className="w-full min-w-[880px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                        <th className={thClass}>Factura</th>
                        <th className={thClass}>Cliente</th>
                        <th className={cn(thClass, 'text-right')}>Total</th>
                        <th className={thClass}>Método</th>
                        <th className={thClass}>Estado</th>
                        <th className={thClass}>Fecha</th>
                        <th className={cn(thClass, 'w-[5.5rem]')}>
                          <span className="sr-only">Acciones</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {filteredSales.map(sale => {
                        const { date, time } = formatDateTime(sale.createdAt)
                        return (
                          <tr
                            key={sale.id}
                            className="casa-artesanal-preserve-surface cursor-pointer transition-colors hover:bg-zinc-100/90 dark:hover:bg-zinc-800/40"
                            onClick={() => onView(sale)}
                          >
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
                              <div className="flex flex-col gap-0.5">
                                <span>{generateInvoiceNumber(sale)}</span>
                                {sale.paymentMethod === 'credit' && credits[sale.id] && (
                                  <span className="text-[11px] font-normal text-zinc-500">
                                    Crédito #{getCreditId(credits[sale.id])}
                                  </span>
                                )}
                                {isTransferSale(sale) && transfers[sale.id] && (
                                  <span className="text-[11px] font-normal text-zinc-500">
                                    TRF {transfers[sale.id].transferNumber || `#${getTransferId(transfers[sale.id])}`}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="max-w-[14rem] px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                              <span className="line-clamp-2" title={sale.clientName}>
                                {sale.clientName}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-800 dark:text-zinc-200">
                              {formatCurrency(sale.total)}
                            </td>
                            <td className={cn(tdClass, 'whitespace-nowrap text-zinc-700 dark:text-zinc-200')}>
                              <PaymentMethodLabel method={sale.paymentMethod} />
                            </td>
                            <td className={cn(tdClass, 'whitespace-nowrap')}>
                              <span className="inline-flex items-center gap-2">
                                <StatusDot tone={getStatusTone(sale)} />
                                {getEffectiveStatusLabel(sale)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                              <div className="text-sm tabular-nums">{date}</div>
                              <div className="text-xs text-zinc-500">{time}</div>
                            </td>
                            <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-0.5">
                                <button
                                  type="button"
                                  className={rowIconBtnClass}
                                  title="Ver factura"
                                  aria-label="Ver factura"
                                  onClick={() => onView(sale)}
                                >
                                  <Eye className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                                {sale.status !== 'cancelled' && (
                                  <button
                                    type="button"
                                    className={rowIconBtnClass}
                                    title="Imprimir"
                                    aria-label="Imprimir"
                                    onClick={() => onPrint(sale)}
                                  >
                                    <Printer className="h-4 w-4" strokeWidth={1.5} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
              </div>

              {/* Paginación - solo mostrar si no hay búsqueda activa */}
              {!searchTerm.trim() && (
                <div className="flex items-center justify-center gap-1 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800 md:px-6">
                  <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: Math.ceil(totalSales / SALES_PAGE_SIZE) }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === Math.ceil(totalSales / SALES_PAGE_SIZE) ||
                          Math.abs(page - currentPage) <= 2
                        )
                      })
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1

                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && <span className="px-1 text-xs text-zinc-400">...</span>}
                            <button
                              type="button"
                              onClick={() => onPageChange(page)}
                              disabled={loading}
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors',
                                page === currentPage
                                  ? 'bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
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
                    disabled={currentPage >= Math.ceil(totalSales / SALES_PAGE_SIZE) || loading}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  )
}

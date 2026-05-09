'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Plus,
  Receipt,
  Printer,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react'
import { Sale, Credit, StoreStockTransfer } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'
import { usePermissions } from '@/hooks/usePermissions'
import { CreditsService } from '@/lib/credits-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { cn } from '@/lib/utils'
import { SALES_PAGE_SIZE } from '@/lib/sales-service'
import { cardShell } from '@/lib/card-shell'

const badgeTint = 'casa-artesanal-preserve-surface'

/** Acento como en productos/dashboard */
const salesHeroIconClass = 'text-indigo-600 dark:text-indigo-400'

const thClass =
  'casa-artesanal-preserve-surface whitespace-nowrap bg-zinc-100/95 px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-400'

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
  onRefresh
}: SalesTableProps) {
  const { canCreate, currentUser } = usePermissions()
  const canCreateSales = canCreate('sales')
  const roleNorm = (currentUser?.role ?? '').toLowerCase().trim()
  const isVendedorRole = roleNorm === 'vendedor' || roleNorm === 'vendedora'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchResults, setSearchResults] = useState<Sale[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [credits, setCredits] = useState<Record<string, Credit>>({})
  const [transfers, setTransfers] = useState<Record<string, StoreStockTransfer>>({})

  // Cargar créditos para ventas de tipo crédito
  useEffect(() => {
    const loadCredits = async () => {
      const creditSales = sales.filter(sale => sale.paymentMethod === 'credit' && sale.invoiceNumber)
      const creditsToLoad: Record<string, Credit> = {}
      
      await Promise.all(
        creditSales.map(async (sale) => {
          if (!credits[sale.id] && sale.invoiceNumber) {
            try {
              const credit = await CreditsService.getCreditByInvoiceNumber(sale.invoiceNumber)
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
        setCredits(prev => ({ ...prev, ...creditsToLoad }))
      }
    }
    
    if (sales.length > 0) {
      loadCredits()
    }
  }, [sales])

  // Cargar transferencias para ventas de la tienda principal que puedan ser de transferencia entre tiendas
  useEffect(() => {
    const loadTransfers = async () => {
      // Solo buscar transferencias para ventas de la tienda principal
      // La transferencia se identifica por tener un registro asociado, no por método de pago
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      const mainStoreSales = sales.filter(sale => sale.storeId === MAIN_STORE_ID)
      const transfersToLoad: Record<string, StoreStockTransfer> = {}
      
      await Promise.all(
        mainStoreSales.map(async (sale) => {
          if (!transfers[sale.id]) {
            try {
              const transfer = await StoreStockTransferService.getTransferBySaleId(sale.id)
              if (transfer) {
                transfersToLoad[sale.id] = transfer
              }
            } catch (error) {
              // Error silencioso
            }
          }
        })
      )
      
      if (Object.keys(transfersToLoad).length > 0) {
        setTransfers(prev => ({ ...prev, ...transfersToLoad }))
      }
    }
    
    if (sales.length > 0) {
      loadTransfers()
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
  }, [searchTerm, onSearch])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-0 bg-green-100/85 text-green-900/90 dark:bg-green-950/30 dark:text-green-300/90'
      case 'pending':
        return 'border-0 bg-amber-100/90 text-amber-950/90 dark:bg-amber-950/25 dark:text-amber-200/85'
      case 'cancelled':
        return 'border-0 bg-red-100/90 text-red-900/90 dark:bg-red-950/35 dark:text-red-300/90'
      case 'draft':
        return 'border-0 bg-violet-100/85 text-violet-950/90 dark:bg-violet-950/30 dark:text-violet-200/85'
      default:
        return 'border-0 bg-zinc-100/90 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400'
    }
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

  // Obtener el color del estado real
  const getEffectiveStatusColor = (sale: Sale): string => {
    const effectiveStatus = getEffectiveStatus(sale)
    if (sale.paymentMethod === 'credit' && (effectiveStatus === 'pending' || effectiveStatus === 'partial')) {
      return 'border-0 bg-amber-100/90 text-amber-950/90 dark:bg-amber-950/25 dark:text-amber-200/85'
    }
    if (sale.paymentMethod === 'credit' && effectiveStatus === 'overdue') {
      return 'border-0 bg-red-100/90 text-red-900/90 dark:bg-red-950/35 dark:text-red-300/90'
    }
    return getStatusColor(effectiveStatus)
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'border-0 bg-emerald-100/85 text-emerald-950/90 dark:bg-emerald-950/28 dark:text-emerald-200/88'
      case 'credit':
        return 'border-0 bg-violet-100/88 text-violet-950/90 dark:bg-violet-950/30 dark:text-violet-200/85'
      case 'transfer':
        return 'border-0 bg-sky-100/85 text-sky-950/90 dark:bg-sky-950/30 dark:text-sky-200/85'
      case 'nequi':
        return 'border-0 bg-fuchsia-100/80 text-fuchsia-950/90 dark:bg-fuchsia-950/28 dark:text-fuchsia-200/85'
      case 'bancolombia':
        return 'border-0 bg-amber-100/88 text-amber-950/90 dark:bg-amber-950/28 dark:text-amber-200/88'
      case 'card':
        return 'border-0 bg-indigo-100/88 text-indigo-950/90 dark:bg-indigo-950/30 dark:text-indigo-200/85'
      case 'warranty':
        return 'border-0 bg-zinc-200/90 text-zinc-800 dark:bg-zinc-800/55 dark:text-zinc-300'
      case 'mixed':
        return 'border-0 bg-teal-100/85 text-teal-950/90 dark:bg-teal-950/28 dark:text-teal-200/85'
      default:
        return 'border-0 bg-zinc-100/90 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo/Contado'
      case 'credit':
        return 'Crédito'
      case 'nequi':
        return 'Nequi'
      case 'bancolombia':
        return 'Bancolombia'
      case 'transfer':
        return 'Transferencia (otro / sin canal)'
      case 'card':
        return 'Tarjeta'
      case 'warranty':
        return 'Garantía'
      case 'mixed':
        return 'Mixto'
      default:
        return method
    }
  }

  const statuses = ['all', 'completed', 'pending', 'cancelled']

  // Usar resultados de búsqueda si hay un término de búsqueda, sino usar todas las ventas
  // Pero si está buscando, no mostrar nada hasta que termine la búsqueda
  const salesToShow = searchTerm.trim() ? (isSearching ? [] : searchResults) : sales
  
  // Eliminar duplicados por ID antes de filtrar
  const uniqueSales = salesToShow.filter((sale, index, self) => 
    index === self.findIndex((s) => s.id === sale.id)
  )
  
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

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className={cn('relative overflow-hidden', cardShell)}>
        <CardHeader className="space-y-0 border-b border-zinc-200/80 p-4 dark:border-zinc-800 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Receipt className={cn('h-5 w-5 shrink-0', salesHeroIconClass)} strokeWidth={1.5} aria-hidden />
                <span>Gestión de Ventas</span>
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
                  ? 'Filtra resultados o limpia la búsqueda para ver el listado completo'
                  : 'Administra tus ventas y genera facturas'}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400',
                      loading && 'animate-spin'
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="hidden md:inline">Actualizar</span>
                </Button>
              )}
              {(canCreateSales || isVendedorRole) && (
                <Button
                  onClick={onCreate}
                  size="sm"
                  className="flex-1 border-transparent bg-brand-700 text-white hover:bg-brand-800 sm:flex-none dark:bg-brand-600 dark:hover:bg-brand-500 [&_svg]:text-white"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Nueva Venta</span>
                  <span className="sm:hidden">Nueva</span>
                </Button>
              )}
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
                placeholder={isSearching ? 'Buscando...' : 'Buscar factura o cliente...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar ventas"
                className="h-11 w-full min-w-0 border-0 bg-transparent py-2 pl-10 pr-10 text-sm font-medium text-zinc-900 placeholder:font-normal placeholder:text-zinc-500 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
              />
              {isSearching ? (
                <div className="absolute right-2 top-1/2 z-10 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-violet-600 dark:border-zinc-600 dark:border-t-violet-400" />
                </div>
              ) : searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
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
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filtrar por estado de venta"
                className="h-11 min-w-[10.25rem] max-w-[46vw] cursor-pointer appearance-none border-0 bg-transparent py-2 pl-3 pr-9 text-sm font-medium text-zinc-900 focus:outline-none dark:text-zinc-100 sm:min-w-[14rem] sm:max-w-none"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all'
                      ? 'Todos los estados'
                      : status === 'pending'
                        ? 'Pendientes (Créditos abiertos)'
                        : status === 'cancelled'
                          ? 'Anuladas'
                          : getStatusLabel(status)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/80 dark:text-teal-400/90"
                aria-hidden
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {isSearching ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Buscando ventas...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <Receipt className={cn('h-7 w-7', salesHeroIconClass)} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                {searchTerm.trim() ? 'No se encontraron ventas' : 'No hay ventas registradas'}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                {searchTerm.trim()
                  ? 'Prueba otra factura, cliente o limpia la búsqueda'
                  : 'Comienza creando una nueva venta'}
              </p>
            </div>
          ) : (
            <>
              {/* Móvil y tablet: lista compacta; tabla ancha solo desde lg (evita paginación lejos del bottom nav) */}
              <div className="space-y-1 bg-zinc-50/50 p-3 dark:bg-zinc-950/20 lg:hidden">
                {filteredSales.map(sale => {
                  const { date, time } = formatDateTime(sale.createdAt)
                  return (
                    <div
                      key={sale.id}
                      role="button"
                      tabIndex={0}
                      className="casa-artesanal-preserve-surface w-full cursor-pointer rounded-2xl border-0 bg-transparent p-4 text-left shadow-none transition-colors hover:bg-white/75 dark:hover:bg-zinc-900/45"
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
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <Badge
                              variant="outline"
                              className={cn(badgeTint, 'shrink-0 border-0 px-2 py-0.5 text-[11px] font-normal', getPaymentMethodColor(sale.paymentMethod))}
                            >
                              {getPaymentMethodLabel(sale.paymentMethod)}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(badgeTint, 'shrink-0 border-0 px-2 py-0.5 text-[11px] font-normal', getEffectiveStatusColor(sale))}
                            >
                              {getEffectiveStatusLabel(sale)}
                            </Badge>
                          </div>
                        </div>
                        {sale.status !== 'cancelled' && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 shrink-0"
                            title="Imprimir"
                            onClick={e => {
                              e.stopPropagation()
                              onPrint(sale)
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
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
                        <th className={cn(thClass, 'pl-4')}>Factura</th>
                        <th className={thClass}>Cliente</th>
                        <th className={cn(thClass, 'text-right')}>Total</th>
                        <th className={cn(thClass, 'text-center')}>Método</th>
                        <th className={cn(thClass, 'text-center')}>Estado</th>
                        <th className={thClass}>Fecha</th>
                        <th className={cn(thClass, 'w-12 px-2')} />
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
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  badgeTint,
                                  'inline-flex w-fit max-w-full items-center justify-center border-0 px-2 py-0.5 text-[11px] font-normal whitespace-normal',
                                  getPaymentMethodColor(sale.paymentMethod)
                                )}
                              >
                                {getPaymentMethodLabel(sale.paymentMethod)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  badgeTint,
                                  'inline-flex w-fit items-center justify-center border-0 px-2 py-0.5 text-[11px] font-normal',
                                  getEffectiveStatusColor(sale)
                                )}
                              >
                                {getEffectiveStatusLabel(sale)}
                              </Badge>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300">
                              <div className="text-sm tabular-nums">{date}</div>
                              <div className="text-xs text-zinc-500">{time}</div>
                            </td>
                            <td className="px-1 py-2" onClick={e => e.stopPropagation()}>
                              {sale.status !== 'cancelled' && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                  onClick={() => onPrint(sale)}
                                  title="Imprimir"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
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
        </CardContent>
      </Card>
    </div>
  )
}

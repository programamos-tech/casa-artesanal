'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Receipt, Printer, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Sale, Credit, StoreStockTransfer } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'
import { usePermissions } from '@/hooks/usePermissions'
import { CreditsService } from '@/lib/credits-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { cn } from '@/lib/utils'
import { SALES_PAGE_SIZE } from '@/lib/sales-service'
import { cardShell } from '@/lib/card-shell'

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
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
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300'
      case 'draft':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200 hover:text-purple-900 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 dark:hover:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 dark:hover:text-gray-200'
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
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-300'
    }
    if (sale.paymentMethod === 'credit' && effectiveStatus === 'overdue') {
      return 'bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300'
    }
    return getStatusColor(effectiveStatus)
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
      case 'credit':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
      case 'transfer':
      case 'nequi':
      case 'bancolombia':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
      case 'card':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
      case 'warranty':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
      case 'mixed':
        return 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 dark:hover:text-gray-200'
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
      {/* Header — mismos patrones que Gestión de créditos (payment-table) */}
      <Card className={cardShell}>
        <CardHeader className="space-y-0 p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Receipt
                  className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span>Gestión de Ventas</span>
                <StoreBadge />
              </CardTitle>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Administra tus ventas y genera facturas
              </p>
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
              {(canCreateSales || isVendedorRole) && (
                <Button onClick={onCreate} size="sm" className="flex-1 sm:flex-none">
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Nueva Venta</span>
                  <span className="sm:hidden">Nueva</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card className={cardShell}>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={isSearching ? "Buscando..." : "Buscar factura o cliente..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-10 md:pr-4 py-2 md:py-2.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {isSearching && (
                <div className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                </div>
              )}
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-neutral-800"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'Todos los estados' : 
                   status === 'pending' ? 'Pendientes (Créditos abiertos)' :
                   status === 'cancelled' ? 'Anuladas' :
                   getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className={cn('overflow-hidden', cardShell)}>
        <CardContent className="p-0">
          {isSearching ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Buscando ventas...</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchTerm.trim() ? 'No se encontraron ventas' : 'No hay ventas registradas'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm.trim() ? 'Intenta con otros criterios de búsqueda' : 'Comienza creando una nueva venta'}
              </p>
            </div>
          ) : (
            <>
              {/* Móvil y tablet: lista compacta; tabla ancha solo desde lg (evita paginación lejos del bottom nav) */}
              <div className="space-y-2 p-3 lg:hidden">
                {filteredSales.map(sale => {
                  const { date, time } = formatDateTime(sale.createdAt)
                  return (
                    <div
                      key={sale.id}
                      role="button"
                      tabIndex={0}
                      className="w-full cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 text-left transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-800/40"
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
                            <Badge className={`${getPaymentMethodColor(sale.paymentMethod)} shrink-0`}>
                              {getPaymentMethodLabel(sale.paymentMethod)}
                            </Badge>
                            <Badge className={`${getEffectiveStatusColor(sale)} shrink-0`}>
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
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Factura
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Cliente
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Total
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Método
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Estado
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Fecha
                        </th>
                        <th className="w-12 bg-zinc-50/80 px-2 py-3 dark:bg-zinc-900/50" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {filteredSales.map(sale => {
                        const { date, time } = formatDateTime(sale.createdAt)
                        return (
                          <tr
                            key={sale.id}
                            className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/25"
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
                                className={`${getPaymentMethodColor(sale.paymentMethod)} inline-flex w-fit max-w-full items-center justify-center text-[11px] whitespace-normal`}
                              >
                                {getPaymentMethodLabel(sale.paymentMethod)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={`${getEffectiveStatusColor(sale)} inline-flex w-fit items-center justify-center text-[11px]`}>
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
                <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-gray-200 dark:border-neutral-700">
                    <button
                      onClick={() => onPageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    className="h-7 w-7 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    
                  <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.ceil(totalSales / SALES_PAGE_SIZE) }, (_, i) => i + 1)
                        .filter(page => {
                          return page === 1 || 
                                 page === Math.ceil(totalSales / SALES_PAGE_SIZE) || 
                                 Math.abs(page - currentPage) <= 2
                        })
                        .map((page, index, array) => {
                          const showEllipsis = index > 0 && page - array[index - 1] > 1
                          
                          return (
                            <div key={page} className="flex items-center">
                              {showEllipsis && (
                              <span className="px-1 text-gray-400 text-xs">...</span>
                              )}
                              <button
                                onClick={() => onPageChange(page)}
                                disabled={loading}
                              className={`h-7 min-w-[28px] px-2 text-xs rounded border transition-colors ${
                                  page === currentPage 
                                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 font-medium" 
                                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-100 dark:border-neutral-600"
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          )
                        })}
                    </div>
                    
                    <button
                      onClick={() => onPageChange(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalSales / SALES_PAGE_SIZE) || loading}
                    className="h-7 w-7 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

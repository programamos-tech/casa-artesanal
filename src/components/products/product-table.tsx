'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Tag,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { Product, Category } from '@/types'
import type { StockFilter } from '@/lib/products-service'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/contexts/auth-context'
import { StoreBadge } from '@/components/ui/store-badge'
import { getCurrentUserStoreId, isStoreSincelejo } from '@/lib/store-helper'
import { StoresService } from '@/lib/stores-service'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'

const ITEMS_PER_PAGE = 15

const actionIconBtnClass =
  'h-9 w-9 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'

const actionDeleteBtnClass =
  'h-9 w-9 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400'

interface ProductTableProps {
  products: Product[]
  categories: Category[]
  loading: boolean
  currentPage: number
  totalProducts: number
  hasMore: boolean
  isSearching: boolean
  stockFilter: StockFilter
  onFilterChange: (filter: StockFilter) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onCreate: () => void
  onManageCategories: () => void
  onStockAdjustment?: (product: Product) => void
  onStockTransfer?: (product: Product) => void
  onRefresh?: () => void
  onPageChange: (page: number) => void
  onSearch: (searchTerm: string) => Promise<Product[]>
  onView?: (product: Product) => void
}

export function ProductTable({
  products,
  categories,
  loading,
  currentPage,
  totalProducts,
  hasMore,
  isSearching,
  stockFilter,
  onFilterChange,
  onEdit,
  onDelete,
  onCreate,
  onManageCategories,
  onStockAdjustment,
  onStockTransfer,
  onRefresh,
  onPageChange,
  onSearch,
  onView,
}: ProductTableProps) {
  const router = useRouter()
  const { hasPermission } = usePermissions()
  const { user } = useAuth()

  const isVendedor =
    user?.role?.toLowerCase() === 'vendedor' || user?.role === 'vendedor' || user?.role === 'Vendedor'
  const isInventario = user?.role?.toLowerCase() === 'inventario'
  const isSuperAdmin =
    user?.role === 'superadmin' || user?.role === 'Super Admin' || user?.role === 'Super Administrador'

  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
  const isMainStore = !user?.storeId || user?.storeId === MAIN_STORE_ID

  const [isSincelejoStore, setIsSincelejoStore] = useState(false)
  useEffect(() => {
    const load = async () => {
      const storeId = getCurrentUserStoreId() || MAIN_STORE_ID
      const store =
        storeId === MAIN_STORE_ID
          ? await StoresService.getMainStore()
          : await StoresService.getStoreById(storeId)
      setIsSincelejoStore(isStoreSincelejo(store))
    }
    if (user) load()
  }, [user?.storeId])

  const canDoProductActionsSincelejo = isSincelejoStore && (isInventario || isSuperAdmin)
  const canEdit = isVendedor ? false : (canDoProductActionsSincelejo || isSuperAdmin) && hasPermission('products', 'edit')
  const canAdjust = isVendedor ? false : (canDoProductActionsSincelejo || isSuperAdmin) && hasPermission('products', 'edit')
  const canCreate = isVendedor ? false : canDoProductActionsSincelejo && hasPermission('products', 'create')
  const canDelete = isVendedor ? false : canDoProductActionsSincelejo && hasPermission('products', 'delete')
  const canTransfer = isVendedor ? false : canDoProductActionsSincelejo && hasPermission('products', 'edit')

  const [searchTerm, setSearchTerm] = useState('')

  const handleSearch = (term: string) => {
    onSearch(term)
  }

  useEffect(() => {
    if (!searchTerm.trim()) return
    const timeoutId = setTimeout(() => handleSearch(searchTerm), 500)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const goProduct = (p: Product) => {
    if (onView) onView(p)
    else router.push(`/inventory/products/${p.id}`)
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || 'Sin categoría'
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-emerald-300/80 bg-emerald-100/75 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-300/95'
      case 'inactive':
        return 'border-zinc-300/90 bg-zinc-100/90 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/55 dark:text-zinc-400'
      case 'discontinued':
        return 'border-violet-200/90 bg-violet-50/85 text-violet-900 dark:border-violet-900/45 dark:bg-violet-950/35 dark:text-violet-300/90'
      case 'out_of_stock':
        return 'border-rose-200/90 bg-rose-50/85 text-rose-900 dark:border-rose-900/45 dark:bg-rose-950/35 dark:text-rose-300/90'
      default:
        return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo'
      case 'inactive':
        return 'Inactivo'
      case 'discontinued':
        return 'Descontinuado'
      case 'out_of_stock':
        return 'Sin Stock'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return CheckCircle
      case 'inactive':
        return Pause
      case 'discontinued':
        return XCircle
      case 'out_of_stock':
        return AlertTriangle
      default:
        return CheckCircle
    }
  }

  const getStockStatusLabel = (product: Product) => {
    const { warehouse, store, total } = product.stock
    if (total === 0) return 'Sin Stock'
    if (store > 0) {
      if (store >= 10) return 'Disponible Local'
      if (store >= 5) return 'Stock Local Bajo'
      return 'Stock Local Muy Bajo'
    }
    if (warehouse > 0) {
      if (warehouse >= 20) return 'Solo Bodega'
      if (warehouse >= 10) return 'Solo Bodega (Bajo)'
      return 'Solo Bodega (Muy Bajo)'
    }
    return 'Sin Stock'
  }

  const getStockStatusBadgeClass = (product: Product) => {
    const { warehouse, store, total } = product.stock
    if (total === 0) {
      return 'border-rose-200/90 bg-rose-50/85 text-rose-900 dark:border-rose-900/45 dark:bg-rose-950/40 dark:text-rose-300/90'
    }
    if (store > 0) {
      if (store >= 10) {
        return 'border-emerald-300/80 bg-emerald-100/75 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:text-emerald-300/90'
      }
      if (store >= 5) {
        return 'border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-200/90'
      }
      return 'border-orange-200/90 bg-orange-50/90 text-orange-950 dark:border-orange-900/45 dark:bg-orange-950/35 dark:text-orange-300/90'
    }
    if (warehouse > 0) {
      return 'border-sky-200/90 bg-sky-50/85 text-sky-900 dark:border-sky-900/45 dark:bg-sky-950/35 dark:text-sky-300/90'
    }
    return 'border-rose-200/90 bg-rose-50/85 text-rose-900 dark:border-rose-900/45 dark:bg-rose-950/40 dark:text-rose-300/90'
  }

  const stockStatusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'Sin Stock', label: 'Sin Stock' },
    { value: 'Disponible Local', label: 'Disponible Local' },
    { value: 'Stock Local Bajo', label: 'Stock Local Bajo' },
    { value: 'Stock Local Muy Bajo', label: 'Stock Local Muy Bajo' },
    ...(isMainStore
      ? [
          { value: 'Solo Bodega', label: 'Solo Bodega' },
          { value: 'Solo Bodega (Bajo)', label: 'Solo Bodega (Bajo)' },
          { value: 'Solo Bodega (Muy Bajo)', label: 'Solo Bodega (Muy Bajo)' },
        ]
      : []),
  ]

  const thClass =
    'whitespace-nowrap bg-zinc-50/80 px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500'

  return (
    <TooltipProvider>
      <div className="space-y-4 md:space-y-6">
        <Card className={cardShell}>
          <CardHeader className="space-y-0 p-4 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-1.5">
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                  <Package className="h-5 w-5 shrink-0 text-emerald-600/85 dark:text-emerald-500/80" strokeWidth={1.5} aria-hidden />
                  <span>Gestión de productos</span>
                  <StoreBadge />
                  {isSearching && (
                    <Badge variant="outline" className="border-zinc-300 text-[11px] font-normal text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
                      Búsqueda activa
                    </Badge>
                  )}
                </CardTitle>
                <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {isSearching
                    ? `Resultados de búsqueda (${products.length} productos)`
                    : 'Administra tu inventario de productos'}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                {canCreate && (
                  <Button onClick={onCreate} size="sm" className="flex-1 sm:flex-none">
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">Nuevo producto</span>
                    <span className="sm:hidden">Nuevo</span>
                  </Button>
                )}
                {!canCreate && hasPermission('products', 'create') && (
                  <span className="rounded-md border border-amber-200/80 bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    Solo puedes crear en la tienda de Sincelejo
                  </span>
                )}
                {isSincelejoStore && canEdit && (
                  <Button onClick={onManageCategories} size="sm" variant="secondary" className="flex-1 sm:flex-none">
                    <Tag className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden md:inline">Categorías</span>
                  </Button>
                )}
                {onRefresh && (
                  <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <RefreshCw className={cn('h-3.5 w-3.5 shrink-0', loading && 'animate-spin')} />
                    <span className="hidden md:inline">Actualizar</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className={cardShell}>
          <CardContent className="p-3 md:p-4">
            <div className="flex min-h-11 flex-nowrap items-stretch overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSearch(searchTerm)
                    }
                  }}
                  className="h-11 w-full min-w-0 border-0 bg-transparent py-2 pl-10 pr-20 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-400/30 dark:text-zinc-100 dark:focus:ring-zinc-500/25"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('')
                      handleSearch('')
                    }}
                    className="absolute right-11 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    title="Limpiar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleSearch(searchTerm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  title="Buscar"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              <div className="relative flex shrink-0 items-stretch border-l border-zinc-200 dark:border-zinc-700">
                <select
                  value={stockFilter}
                  onChange={(e) => onFilterChange(e.target.value as StockFilter)}
                  aria-label="Filtrar por estado de stock"
                  className="h-11 min-w-[10.25rem] max-w-[46vw] cursor-pointer appearance-none border-0 bg-transparent py-2 pl-3 pr-9 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-400/30 dark:text-zinc-100 dark:focus:ring-zinc-500/25 sm:min-w-[12.5rem] sm:max-w-none"
                >
                  {stockStatusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                  aria-hidden
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn('relative overflow-hidden', cardShell)}>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-zinc-950/50">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
            </div>
          )}
          <CardContent className="p-0">
            {products.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-600">
                  <Package className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">No hay productos</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                  Ajusta filtros o crea uno con <span className="font-medium text-zinc-700 dark:text-zinc-300">Nuevo producto</span>
                </p>
                {canCreate && (
                  <Button onClick={onCreate} size="sm" className="mt-4">
                    Nuevo producto
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2 p-3 lg:hidden">
                  {products.map((product) => {
                    const StatusIcon = getStatusIcon(product.status)
                    return (
                      <div
                        key={product.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 text-left transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-800/40"
                        onClick={() => goProduct(product)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            goProduct(product)
                          }
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400">{product.reference}</span>
                              <p className="mt-0.5 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">{product.name}</p>
                              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{getCategoryName(product.categoryId)}</p>
                            </div>
                            <Badge variant="outline" className={cn('shrink-0 border px-2 py-0.5 text-[11px] font-normal', getStatusBadgeClass(product.status))}>
                              <span className="flex items-center gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {getStatusLabel(product.status)}
                              </span>
                            </Badge>
                          </div>
                          {isMainStore ? (
                            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
                              {(['Bodega', 'Local', 'Total'] as const).map((label, i) => (
                                <div key={label} className="text-center">
                                  <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
                                  <div className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                                    {i === 0 ? product.stock.warehouse : i === 1 ? product.stock.store : product.stock.total}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 border-t border-zinc-200/80 pt-3 text-center dark:border-zinc-800">
                              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Stock</div>
                              <div className="mt-0.5 text-sm font-semibold tabular-nums">{product.stock.store}</div>
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
                            <Badge
                              variant="outline"
                              className={cn('border px-2 py-0.5 text-[11px] font-normal', getStockStatusBadgeClass(product))}
                            >
                              {getStockStatusLabel(product)}
                            </Badge>
                            <div className="flex shrink-0 gap-0.5" role="none" onClick={(e) => e.stopPropagation()}>
                              {canEdit && (
                                <Button type="button" size="sm" variant="ghost" className={actionIconBtnClass} onClick={() => onEdit(product)} title="Editar">
                                  <Edit className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              )}
                              {canAdjust && onStockAdjustment && (
                                <Button type="button" size="sm" variant="ghost" className={actionIconBtnClass} onClick={() => onStockAdjustment(product)} title="Ajustar stock">
                                  <Package className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              )}
                              {canTransfer && onStockTransfer && (
                                <Button type="button" size="sm" variant="ghost" className={actionIconBtnClass} onClick={() => onStockTransfer(product)} title="Transferir">
                                  <ArrowRightLeft className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              )}
                              {canDelete && (
                                <Button type="button" size="sm" variant="ghost" className={actionDeleteBtnClass} onClick={() => onDelete(product)} title="Eliminar">
                                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="hidden lg:block">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                          <th className={cn(thClass, 'pl-4')}>Producto</th>
                          {isMainStore ? (
                            <>
                              <th className={thClass}>Bodega</th>
                              <th className={thClass}>Local</th>
                              <th className={thClass}>Total</th>
                            </>
                          ) : (
                            <th className={thClass}>Stock</th>
                          )}
                          <th className={thClass}>Estado stock</th>
                          <th className={thClass}>Catálogo</th>
                          <th className="w-[11rem] bg-zinc-50/80 px-2 py-3 dark:bg-zinc-900/50" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                        {products.map((product) => {
                          const StatusIcon = getStatusIcon(product.status)
                          return (
                            <tr
                              key={product.id}
                              className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/25"
                              onClick={() => goProduct(product)}
                            >
                              <td className="max-w-[min(24rem,40vw)] px-4 py-3">
                                <div className="min-w-0">
                                  <span className="font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-400">{product.reference}</span>
                                  <p className="mt-0.5 truncate font-semibold text-zinc-900 dark:text-zinc-100">{product.name}</p>
                                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{getCategoryName(product.categoryId)}</p>
                                </div>
                              </td>
                              {isMainStore ? (
                                <>
                                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-zinc-800 dark:text-zinc-200">{product.stock.warehouse}</td>
                                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-zinc-800 dark:text-zinc-200">{product.stock.store}</td>
                                  <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{product.stock.total}</td>
                                </>
                              ) : (
                                <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{product.stock.store}</td>
                              )}
                              <td className="px-3 py-3">
                                <Badge variant="outline" className={cn('inline-flex border px-2 py-0.5 text-[11px] font-normal', getStockStatusBadgeClass(product))}>
                                  {getStockStatusLabel(product)}
                                </Badge>
                              </td>
                              <td className="px-3 py-3">
                                <Badge variant="outline" className={cn('inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-normal', getStatusBadgeClass(product.status))}>
                                  <StatusIcon className="h-3 w-3 shrink-0" />
                                  {getStatusLabel(product.status)}
                                </Badge>
                              </td>
                              <td className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-wrap items-center justify-end gap-0.5">
                                  {canEdit && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button type="button" size="sm" variant="ghost" className={actionIconBtnClass} onClick={() => onEdit(product)}>
                                          <Edit className="h-4 w-4" strokeWidth={1.5} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="z-[200]">
                                        Editar producto
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {canAdjust && onStockAdjustment && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button type="button" size="sm" variant="ghost" className={actionIconBtnClass} onClick={() => onStockAdjustment(product)}>
                                          <Package className="h-4 w-4" strokeWidth={1.5} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="z-[200]">
                                        Ajustar stock
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {canTransfer && onStockTransfer && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button type="button" size="sm" variant="ghost" className={actionIconBtnClass} onClick={() => onStockTransfer(product)}>
                                          <ArrowRightLeft className="h-4 w-4" strokeWidth={1.5} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="z-[200]">
                                        Transferir bodega ↔ local
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {canDelete && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button type="button" size="sm" variant="ghost" className={actionDeleteBtnClass} onClick={() => onDelete(product)}>
                                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="z-[200]">
                                        Eliminar
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!isSearching && totalProducts > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-center gap-1 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800 md:px-6">
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: Math.ceil(totalProducts / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => {
                    const last = Math.ceil(totalProducts / ITEMS_PER_PAGE)
                    if (page === 1 || page === 2 || page === last || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => onPageChange(page)}
                          disabled={loading}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors',
                            currentPage === page
                              ? 'bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
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
                </div>
                <button
                  type="button"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={!hasMore || loading}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

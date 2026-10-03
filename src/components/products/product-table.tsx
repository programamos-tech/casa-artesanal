'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Package, Plus, Search, Edit, Eye, Trash2, X, RefreshCw, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Product, Category } from '@/types'
import type { StockFilter, CategoryFilter } from '@/lib/products-service'
import { isReferenceLikeQuery, minSearchLength } from '@/lib/product-search'
import { usePermissions } from '@/hooks/usePermissions'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 15

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const rowDeleteBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-rose-600 dark:text-white/40 dark:hover:text-rose-400'

const headerIconBtnClass =
  'flex h-8 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-white/45 dark:hover:text-white'

const headerSecondaryBtnClass =
  'casa-artesanal-preserve-surface inline-flex h-8 items-center rounded-md border border-zinc-200 px-3 text-[13px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-white/[0.14] dark:text-white/80 dark:hover:border-white/25 dark:hover:text-white'

const headerPrimaryBtnClass =
  'casa-artesanal-preserve-surface inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-900 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'

const filterSelectWrapClass =
  'relative h-8 shrink-0 border-l border-zinc-200 dark:border-white/[0.08]'

const filterSelectClass =
  'block h-full w-full cursor-pointer appearance-none truncate border-0 bg-transparent pl-3 pr-8 text-[13px] text-zinc-600 transition-colors hover:text-zinc-900 focus:outline-none dark:text-white/60 dark:hover:text-white'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'

const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

interface ProductTableProps {
  products: Product[]
  categories: Category[]
  loading: boolean
  currentPage: number
  totalProducts: number
  hasMore: boolean
  isSearching: boolean
  searchLoading?: boolean
  filtersLoading?: boolean
  stockFilter: StockFilter
  categoryFilter: CategoryFilter
  onFilterChange: (filter: StockFilter) => void
  onCategoryFilterChange: (filter: CategoryFilter) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
  onCreate: () => void
  onManageCategories: () => void
  onStockAdjustment?: (product: Product) => void
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
  searchLoading = false,
  filtersLoading = false,
  stockFilter,
  categoryFilter,
  onFilterChange,
  onCategoryFilterChange,
  onEdit,
  onDelete,
  onCreate,
  onManageCategories,
  onStockAdjustment,
  onRefresh,
  onPageChange,
  onSearch,
  onView,
}: ProductTableProps) {
  const { hasPermission } = usePermissions()

  const canEdit = hasPermission('products', 'edit')
  const canAdjust = hasPermission('products', 'edit')
  const canCreate = hasPermission('products', 'create')
  const canDelete = hasPermission('products', 'delete')

  const [searchTerm, setSearchTerm] = useState('')
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch
  const lastSearchedTermRef = useRef<string | null>(null)

  useEffect(() => {
    const term = searchTerm.trim()
    const delay = isReferenceLikeQuery(term) ? 80 : 180

    // Vacío → volver al listado normal
    if (!term) {
      if (lastSearchedTermRef.current === '' || lastSearchedTermRef.current === null) {
        return
      }
      const timeoutId = setTimeout(() => {
        lastSearchedTermRef.current = ''
        void onSearchRef.current('')
      }, 80)
      return () => clearTimeout(timeoutId)
    }

    // Esperar longitud mínima (1 para códigos, 2 para texto)
    if (term.length < minSearchLength(term)) {
      return
    }

    if (term === lastSearchedTermRef.current) {
      return
    }

    const timeoutId = setTimeout(() => {
      lastSearchedTermRef.current = term
      void onSearchRef.current(term)
    }, delay)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const activeCategories = useMemo(
    () =>
      categories
        .filter((c) => c.status === 'active')
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [categories]
  )

  const categoryById = useMemo(
    () => new Map(activeCategories.map((c) => [c.id, c.name])),
    [activeCategories]
  )

  const goProduct = (p: Product) => {
    if (onView) onView(p)
    else onEdit(p)
  }

  const getCategoryLabel = (product: Product) => {
    if (product.categoryName?.trim()) return product.categoryName.trim()
    if (product.categoryId && categoryById.has(product.categoryId)) {
      return categoryById.get(product.categoryId)!
    }
    return 'Sin categoría'
  }

  /** Estado de catálogo: solo se muestra cuando NO está activo. */
  const getCatalogLabel = (status: string): string | null => {
    switch (status) {
      case 'active':
        return null
      case 'inactive':
        return 'Inactivo'
      case 'discontinued':
        return 'Descontinuado'
      case 'out_of_stock':
        return 'Agotado'
      default:
        return status
    }
  }

  const getStockState = (product: Product): { label: string; tone: ReportTone } => {
    const store = product.stock?.store || 0
    if (store === 0) return { label: 'Sin stock', tone: 'danger' }
    if (store >= 10) return { label: 'Disponible', tone: 'success' }
    if (store >= 5) return { label: 'Stock bajo', tone: 'warning' }
    return { label: 'Stock muy bajo', tone: 'warning' }
  }

  const formatSalePrice = (product: Product) => {
    const price = Number(product.retailPrice ?? product.price ?? 0)
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  /** `value` debe coincidir con los estados que entiende ProductsService. */
  const stockStatusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'Sin Stock', label: 'Sin stock' },
    { value: 'Disponible Local', label: 'Disponible' },
    { value: 'Stock Local Bajo', label: 'Stock bajo' },
    { value: 'Stock Local Muy Bajo', label: 'Stock muy bajo' },
  ]

  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE)

  const subtitle = 'Catálogo, precios de venta y stock disponible en la tienda seleccionada.'

  const renderRowActions = (product: Product) => (
    <div className="flex items-center justify-end gap-0.5" role="none" onClick={(e) => e.stopPropagation()}>
      <button type="button" className={rowIconBtnClass} onClick={() => goProduct(product)} title="Ver producto" aria-label="Ver producto">
        <Eye className="h-4 w-4" strokeWidth={1.5} />
      </button>
      {canEdit && (
        <button type="button" className={rowIconBtnClass} onClick={() => onEdit(product)} title="Editar producto" aria-label="Editar producto">
          <Edit className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
      {canAdjust && onStockAdjustment && (
        <button type="button" className={rowIconBtnClass} onClick={() => onStockAdjustment(product)} title="Ajustar stock" aria-label="Ajustar stock">
          <Package className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
      {canDelete && (
        <button type="button" className={rowDeleteBtnClass} onClick={() => onDelete(product)} title="Eliminar" aria-label="Eliminar">
          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">Productos</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
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
          {canEdit && (
            <button type="button" onClick={onManageCategories} className={headerSecondaryBtnClass}>
              Categorías
            </button>
          )}
          {canCreate && (
            <button type="button" onClick={onCreate} className={headerPrimaryBtnClass}>
              <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Nuevo producto
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          'casa-artesanal-preserve-surface relative flex flex-wrap items-center rounded-xl border border-zinc-200 p-1 transition-colors sm:flex-nowrap',
          'focus-within:border-zinc-300 dark:border-white/[0.1] dark:focus-within:border-white/20',
          filtersLoading && 'opacity-80'
        )}
      >
        <div className="relative flex min-w-[12rem] flex-1 items-center">
          <Search className="pointer-events-none absolute left-2 h-4 w-4 text-zinc-400 dark:text-white/35" strokeWidth={1.5} aria-hidden />
          <input
            type="search"
            placeholder={searchLoading ? 'Buscando…' : 'Buscar producto o referencia…'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const term = searchTerm.trim()
                if (!term) {
                  lastSearchedTermRef.current = ''
                  void onSearchRef.current('')
                  return
                }
                if (term.length < minSearchLength(term)) return
                lastSearchedTermRef.current = term
                void onSearchRef.current(term)
              }
            }}
            aria-label="Buscar producto por referencia, nombre o marca"
            aria-busy={searchLoading}
            className="h-8 w-full min-w-0 border-0 bg-transparent pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-white/35 [&::-webkit-search-cancel-button]:hidden"
          />
          {searchLoading || filtersLoading ? (
            <div className="absolute right-2" aria-hidden>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500 dark:border-white/15 dark:border-t-white/60" />
            </div>
          ) : searchTerm ? (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                lastSearchedTermRef.current = ''
                void onSearchRef.current('')
              }}
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
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value as CategoryFilter)}
            aria-label="Filtrar por categoría"
            className={filterSelectClass}
          >
            <option value="all">Todas las categorías</option>
            {activeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40" aria-hidden />
        </div>

        <div className={cn(filterSelectWrapClass, 'min-w-[9.5rem]')}>
          <select
            value={stockFilter}
            onChange={(e) => onFilterChange(e.target.value as StockFilter)}
            aria-label="Filtrar por estado de stock"
            className={filterSelectClass}
          >
            {stockStatusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40" aria-hidden />
        </div>
      </div>

      <div className="relative">
        {loading && !searchLoading && products.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" aria-hidden={!loading}>
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          </div>
        )}

        {products.length === 0 ? (
          <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {loading ? 'Cargando productos…' : 'No hay productos'}
            </p>
            {!loading && (
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Ajusta los filtros o crea uno con «Nuevo producto».
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
              {products.map((product) => {
                const stock = getStockState(product)
                const catalog = getCatalogLabel(product.status)
                return (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    className="casa-artesanal-preserve-surface flex cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    onClick={() => goProduct(product)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        goProduct(product)
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{product.name}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {product.reference} · {getCategoryLabel(product)}
                        {catalog ? ` · ${catalog}` : ''}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                        <StatusDot tone={stock.tone} />
                        {stock.label} · {product.stock.store} und.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{formatSalePrice(product)}</span>
                      {renderRowActions(product)}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                    <th className={thClass}>Producto</th>
                    <th className={thClass}>Referencia</th>
                    <th className={thClass}>Categoría</th>
                    <th className={cn(thClass, 'text-right')}>Precio venta</th>
                    <th className={cn(thClass, 'text-right')}>Stock</th>
                    <th className={thClass}>Estado</th>
                    <th className={cn(thClass, 'w-[9rem]')}>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const stock = getStockState(product)
                    const catalog = getCatalogLabel(product.status)
                    return (
                      <tr
                        key={product.id}
                        className="casa-artesanal-preserve-surface group cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                        onClick={() => goProduct(product)}
                      >
                        <td className={cn(tdClass, 'max-w-[min(22rem,32vw)]')}>
                          <span className="block truncate font-medium text-zinc-900 dark:text-zinc-50">
                            {product.name}
                            {catalog ? (
                              <span className="ml-2 text-xs font-normal text-zinc-400 dark:text-zinc-500">{catalog}</span>
                            ) : null}
                          </span>
                        </td>
                        <td className={cn(tdClass, 'whitespace-nowrap text-zinc-500 dark:text-zinc-400')}>{product.reference}</td>
                        <td className={cn(tdClass, 'max-w-[12rem] truncate text-zinc-500 dark:text-zinc-400')}>{getCategoryLabel(product)}</td>
                        <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>{formatSalePrice(product)}</td>
                        <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>{product.stock.store}</td>
                        <td className={cn(tdClass, 'whitespace-nowrap')}>
                          <span className="inline-flex items-center gap-2">
                            <StatusDot tone={stock.tone} />
                            {stock.label}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">{renderRowActions(product)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!isSearching && totalProducts > ITEMS_PER_PAGE && (
          <div className="mt-4 flex items-center justify-between gap-3 sm:pr-16">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (page === 1 || page === 2 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => onPageChange(page)}
                      disabled={loading}
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
                onClick={() => onPageChange(currentPage + 1)}
                disabled={!hasMore || loading}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100"
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

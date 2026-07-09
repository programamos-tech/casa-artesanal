'use client'

import React, { createContext, useState, useContext, useEffect, useCallback, useRef, ReactNode } from 'react'
import { Product } from '@/types'
import { ProductsService, StockFilter, CategoryFilter } from '@/lib/products-service'
import { useAuth } from './auth-context'

interface ProductsContextType {
  products: Product[]
  loading: boolean
  currentPage: number
  totalProducts: number
  hasMore: boolean
  isSearching: boolean
  searchLoading: boolean
  filtersLoading: boolean
  stockFilter: StockFilter
  categoryFilter: CategoryFilter
  productsLastUpdated: number
  setStockFilter: (filter: StockFilter) => void
  setCategoryFilter: (filter: CategoryFilter) => void
  applyProductFilters: (opts?: {
    page?: number
    stock?: StockFilter
    category?: CategoryFilter
    search?: string
    silent?: boolean
    filtersOverlay?: boolean
  }) => Promise<void>
  createProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>
  deleteProduct: (id: string) => Promise<{ success: boolean, error?: string }>
  searchProducts: (searchTerm: string) => Promise<Product[]>
  clearSearch: () => Promise<void>
  refreshProducts: (filter?: StockFilter, options?: { silent?: boolean }) => Promise<void>
  goToPage: (page: number) => Promise<void>
  transferStock: (productId: string, from: 'warehouse' | 'store', to: 'warehouse' | 'store', quantity: number) => Promise<boolean>
  adjustStock: (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string) => Promise<boolean>
  deductStockForSale: (productId: string, quantity: number) => Promise<boolean>
  returnStockFromSale: (productId: string, quantity: number) => Promise<boolean>
  importProductsFromCSV: (products: any[]) => Promise<boolean>
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

// Número de productos por página
const ITEMS_PER_PAGE = 15

export const ProductsProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [filtersLoading, setFiltersLoading] = useState(false)
  const [stockFilter, setStockFilterState] = useState<StockFilter>('all')
  const [categoryFilter, setCategoryFilterState] = useState<CategoryFilter>('all')
  const [productsLastUpdated, setProductsLastUpdated] = useState(Date.now()) // Timestamp para notificar cambios
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const storeId = currentUser?.storeId
  const listSearchRef = useRef('')
  const stockFilterRef = useRef<StockFilter>('all')
  const categoryFilterRef = useRef<CategoryFilter>('all')
  const fetchSeqRef = useRef(0)

  stockFilterRef.current = stockFilter
  categoryFilterRef.current = categoryFilter

  const applyProductFilters = useCallback(
    async (opts?: {
      page?: number
      stock?: StockFilter
      category?: CategoryFilter
      search?: string
      silent?: boolean
      filtersOverlay?: boolean
    }) => {
      const page = opts?.page ?? 1
      const sf = opts?.stock ?? stockFilterRef.current
      const cf = opts?.category ?? categoryFilterRef.current
      const term = (opts?.search !== undefined ? opts.search : listSearchRef.current).trim()
      const silent = opts?.silent === true
      const seq = ++fetchSeqRef.current

      if (opts?.search !== undefined) {
        listSearchRef.current = opts.search
      }

      if (opts?.filtersOverlay) {
        setFiltersLoading(true)
      } else if (silent) {
        // Refresco en segundo plano: no bloquear la barra de filtros ni la tabla completa
      } else {
        setLoading(true)
      }
      setSearchLoading(!!term)

      try {
        if (term) {
          setIsSearching(true)
          const results = await ProductsService.searchProducts(term, sf, storeId, cf)
          if (seq !== fetchSeqRef.current) return
          setProducts(results)
          setCurrentPage(1)
          setTotalProducts(results.length)
          setHasMore(false)
        } else {
          setIsSearching(false)
          const result = await ProductsService.getAllProducts(page, ITEMS_PER_PAGE, sf, cf)
          if (seq !== fetchSeqRef.current) return
          setProducts(result.products)
          setCurrentPage(page)
          setTotalProducts(result.total)
          setHasMore(result.hasMore)
        }
      } catch {
        // Error silencioso en producción
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false)
          setFiltersLoading(false)
          setSearchLoading(false)
        }
      }
    },
    [storeId]
  )

  const refreshProducts = useCallback(
    async (filter?: StockFilter, options?: { silent?: boolean }) => {
      await applyProductFilters({
        page: 1,
        stock: filter,
        silent: options?.silent ?? true,
      })
    },
    [applyProductFilters]
  )

  useEffect(() => {
    if (authLoading) return
    void applyProductFilters({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial y cambio de tienda
  }, [storeId, authLoading])

  const setStockFilter = useCallback(
    (filter: StockFilter) => {
      setStockFilterState(filter)
      stockFilterRef.current = filter
      void applyProductFilters({
        stock: filter,
        page: 1,
        search: listSearchRef.current,
        silent: true,
        filtersOverlay: true,
      })
    },
    [applyProductFilters]
  )

  const setCategoryFilter = useCallback(
    (filter: CategoryFilter) => {
      setCategoryFilterState(filter)
      categoryFilterRef.current = filter
      void applyProductFilters({
        category: filter,
        page: 1,
        search: listSearchRef.current,
        silent: true,
        filtersOverlay: true,
      })
    },
    [applyProductFilters]
  )

  const createProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    const newProduct = await ProductsService.createProduct(productData, currentUser?.id)
    if (newProduct) {
      setProducts(prev => [newProduct, ...prev])
      // Actualizar el total de productos para que el dashboard se actualice
      setTotalProducts(prev => prev + 1)
      // Notificar cambio para que el dashboard se actualice
      setProductsLastUpdated(Date.now())
      return true
    }
    return false
  }

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    const success = await ProductsService.updateProduct(id, updates, currentUser?.id)
    if (success) {
      setProducts(prev => prev.map(product => {
        if (product.id !== id) return product
        const retailPrice = updates.retailPrice ?? updates.price ?? product.retailPrice ?? product.price
        const wholesalePrice = updates.wholesalePrice ?? product.wholesalePrice ?? retailPrice
        return {
          ...product,
          ...updates,
          retailPrice,
          wholesalePrice,
          price: updates.price ?? retailPrice,
        } as Product
      }))
      // Si se actualizó stock, costo o precio, notificar cambio para el dashboard
      if (
        updates.stock ||
        updates.cost ||
        updates.price ||
        updates.retailPrice !== undefined ||
        updates.wholesalePrice !== undefined ||
        'imageUrl' in updates
      ) {
        setProductsLastUpdated(Date.now())
      }
      return true
    }
    return false
  }

  const deleteProduct = async (id: string): Promise<{ success: boolean, error?: string }> => {
    const result = await ProductsService.deleteProduct(id, currentUser?.id)
    if (result.success) {
      setProducts(prev => prev.filter(product => product.id !== id))
      // Actualizar el total de productos para que el dashboard se actualice
      setTotalProducts(prev => Math.max(0, prev - 1))
    }
    return result
  }

  const clearSearch = useCallback(async (): Promise<void> => {
    listSearchRef.current = ''
    await applyProductFilters({ page: 1, search: '' })
  }, [applyProductFilters])

  const searchProducts = useCallback(
    async (searchTerm: string): Promise<Product[]> => {
      listSearchRef.current = searchTerm
      if (!searchTerm.trim()) {
        await clearSearch()
        return []
      }

      setSearchLoading(true)
      try {
        const results = await ProductsService.searchProducts(
          searchTerm,
          stockFilterRef.current,
          storeId,
          categoryFilterRef.current
        )
        setIsSearching(true)
        setProducts(results)
        setCurrentPage(1)
        setTotalProducts(results.length)
        setHasMore(false)
        return results
      } catch {
        return []
      } finally {
        setSearchLoading(false)
      }
    },
    [storeId, clearSearch]
  )

  const goToPage = async (page: number) => {
    if (page >= 1 && page <= Math.ceil(totalProducts / ITEMS_PER_PAGE) && !loading) {
      await applyProductFilters({
        page,
        search: listSearchRef.current,
        silent: true,
        filtersOverlay: true,
      })
    }
  }

  const mergeProductFromServer = async (productId: string) => {
    const fresh = await ProductsService.getProductById(productId)
    if (fresh) {
      setProducts(prev => {
        if (!prev.some(p => p.id === productId)) return prev
        return prev.map(p => (p.id === productId ? fresh : p))
      })
    } else {
      await refreshProducts(undefined, { silent: true })
    }
    setProductsLastUpdated(Date.now())
  }

  const transferStock = async (productId: string, from: 'warehouse' | 'store', to: 'warehouse' | 'store', quantity: number): Promise<boolean> => {
    const success = await ProductsService.transferStock(productId, from, to, quantity, currentUser?.id)
    if (success) {
      await mergeProductFromServer(productId)
    }
    return success
  }

  const adjustStock = async (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string): Promise<boolean> => {
    const success = await ProductsService.adjustStock(productId, location, newQuantity, reason, currentUser?.id)
    if (success) {
      await mergeProductFromServer(productId)
    }
    return success
  }

  const deductStockForSale = async (productId: string, quantity: number): Promise<boolean> => {
    const result = await ProductsService.deductStockForSale(productId, quantity, currentUser?.id)
    if (result.success) {
      await mergeProductFromServer(productId)
    }
    return result.success
  }

  const returnStockFromSale = async (productId: string, quantity: number): Promise<boolean> => {
    const success = await ProductsService.returnStockFromSale(productId, quantity)
    if (success) {
      await mergeProductFromServer(productId)
    }
    return success
  }

  const importProductsFromCSV = async (products: any[]): Promise<boolean> => {
    const success = await ProductsService.importProductsFromCSV(products)
    if (success) {
      await refreshProducts(undefined, { silent: true })
    }
    return success
  }

  const contextValue = {
    products, 
    loading, 
    currentPage: currentPage || 1,
    totalProducts,
    hasMore,
    isSearching,
    searchLoading,
    filtersLoading,
    stockFilter,
    categoryFilter,
    productsLastUpdated,
    setStockFilter,
    setCategoryFilter,
    applyProductFilters,
    createProduct, 
    updateProduct, 
    deleteProduct, 
    searchProducts, 
    clearSearch,
    refreshProducts,
    goToPage,
    transferStock,
    adjustStock,
    deductStockForSale,
    returnStockFromSale,
    importProductsFromCSV
  }

  return (
    <ProductsContext.Provider value={contextValue}>
      {children}
    </ProductsContext.Provider>
  )
}

export const useProducts = () => {
  const context = useContext(ProductsContext)
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider')
  }
  return context
}

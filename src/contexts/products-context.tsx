'use client'

import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react'
import { Product } from '@/types'
import { ProductsService, StockFilter } from '@/lib/products-service'
import { useAuth } from './auth-context'

interface ProductsContextType {
  products: Product[]
  loading: boolean
  currentPage: number
  totalProducts: number
  hasMore: boolean
  isSearching: boolean
  stockFilter: StockFilter
  productsLastUpdated: number
  setStockFilter: (filter: StockFilter) => void
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
  const [stockFilter, setStockFilterState] = useState<StockFilter>('all')
  const [productsLastUpdated, setProductsLastUpdated] = useState(Date.now()) // Timestamp para notificar cambios
  const { user: currentUser } = useAuth()

  const refreshProducts = useCallback(async (filter?: StockFilter, options?: { silent?: boolean }) => {
    const activeFilter = filter ?? stockFilter
    const silent = options?.silent === true
    if (!silent) setLoading(true)
    try {
      const result = await ProductsService.getAllProducts(1, ITEMS_PER_PAGE, activeFilter)
      setProducts(result.products)
      setCurrentPage(1)
      setTotalProducts(result.total)
      setHasMore(result.hasMore)
      setIsSearching(false)
    } catch (error) {
      // Error silencioso en producción
    } finally {
      if (!silent) setLoading(false)
    }
  }, [currentUser?.storeId, stockFilter]) // Recargar cuando cambie el storeId o el filtro

  useEffect(() => {
    refreshProducts()
  }, [refreshProducts, currentUser?.storeId, stockFilter]) // Recargar cuando cambie el storeId o filtro
  
  const setStockFilter = (filter: StockFilter) => {
    setStockFilterState(filter)
  }

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
      setProducts(prev => prev.map(product => 
        product.id === id ? { ...product, ...updates } as Product : product
      ))
      // Si se actualizó stock, costo o precio, notificar cambio para el dashboard
      if (updates.stock || updates.cost || updates.price || 'imageUrl' in updates) {
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

  const searchProducts = async (searchTerm: string): Promise<Product[]> => {
    if (!searchTerm.trim()) {
      await clearSearch()
      return []
    }
    
    setLoading(true)
    setIsSearching(true)
    
    try {
      // Pasar el storeId del usuario para obtener precios correctos de store_stock
      const results = await ProductsService.searchProducts(searchTerm, stockFilter, currentUser?.storeId)
      setProducts(results)
      setCurrentPage(1) // Resetear a página 1 en búsquedas
      setLoading(false)
      return results
    } catch (error) {
      // Error silencioso en producción
      setLoading(false)
      return []
    }
  }

  const clearSearch = async (): Promise<void> => {
    setIsSearching(false)
    try {
      setLoading(true)
      const result = await ProductsService.getAllProducts(1, ITEMS_PER_PAGE, stockFilter)
      setProducts(result.products)
      setCurrentPage(1)
      setTotalProducts(result.total)
      setHasMore(result.hasMore)
    } catch (error) {
      // Error silencioso en producción
    } finally {
      setLoading(false)
    }
  }

  const goToPage = async (page: number) => {
    if (page >= 1 && page <= Math.ceil(totalProducts / ITEMS_PER_PAGE) && !loading) {
      try {
        setLoading(true)
        const result = await ProductsService.getAllProducts(page, ITEMS_PER_PAGE, stockFilter)
        setProducts(result.products)
        setCurrentPage(page)
        setTotalProducts(result.total)
        setHasMore(result.hasMore)
      } catch (error) {
      // Error silencioso en producción
      } finally {
        setLoading(false)
      }
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
      // Actualizar el estado local - necesitamos refrescar para obtener los valores exactos
      await refreshProducts()
    }
    return result.success
  }

  const returnStockFromSale = async (productId: string, quantity: number): Promise<boolean> => {
    const success = await ProductsService.returnStockFromSale(productId, quantity)
    if (success) {
      // Actualizar el estado local - necesitamos refrescar para obtener los valores exactos
      await refreshProducts()
    }
    return success
  }

  const importProductsFromCSV = async (products: any[]): Promise<boolean> => {
    const success = await ProductsService.importProductsFromCSV(products)
    if (success) {
      await refreshProducts()
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
    stockFilter,
    productsLastUpdated,
    setStockFilter,
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

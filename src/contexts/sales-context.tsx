'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Sale } from '@/types'
import { SalesService, SALES_PAGE_SIZE, SalesListOptions } from '@/lib/sales-service'
import { useAuth } from './auth-context'
import { useProducts } from './products-context'

export type SalesDateRange = {
  start: Date | null
  end: Date | null
}

function toListOptions(range: SalesDateRange): SalesListOptions | undefined {
  if (!range.start && !range.end) return undefined
  return {
    dateRangeStart: range.start ?? range.end ?? undefined,
    dateRangeEnd: range.end ?? range.start ?? undefined,
  }
}

interface SalesContextType {
  sales: Sale[]
  loading: boolean
  currentPage: number
  totalSales: number
  hasMore: boolean
  createSale: (saleData: Omit<Sale, 'id' | 'createdAt'>) => Promise<void>
  updateSale: (id: string, saleData: Partial<Sale>) => Promise<void>
  deleteSale: (id: string) => Promise<void>
  cancelSale: (id: string, reason: string) => Promise<{ success: boolean, totalRefund?: number }>
  finalizeDraftSale: (id: string) => Promise<void>
  searchSales: (searchTerm: string) => Promise<Sale[]>
  refreshSales: () => Promise<void>
  goToPage: (page: number) => Promise<void>
  dateRange: SalesDateRange
  setDateRange: (range: SalesDateRange) => Promise<void>
  clearDateRange: () => Promise<void>
}

const SalesContext = createContext<SalesContextType | undefined>(undefined)

const emptyDateRange: SalesDateRange = { start: null, end: null }

export function SalesProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalSales, setTotalSales] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [dateRange, setDateRangeState] = useState<SalesDateRange>(emptyDateRange)
  const { user: currentUser } = useAuth()
  const { refreshProducts, returnStockFromSale } = useProducts()

  const fetchSales = useCallback(async (
    page: number = 1,
    append: boolean = false,
    activeRange: SalesDateRange = dateRange
  ) => {
    try {
      setLoading(true)
      const result = await SalesService.getAllSales(page, SALES_PAGE_SIZE, toListOptions(activeRange))
      
      if (append) {
        setSales(prev => [...prev, ...result.sales])
      } else {
        setSales(result.sales)
      }
      
      setCurrentPage(page)
      setTotalSales(result.total)
      setHasMore(result.hasMore)
    } catch (error) {
      // Error silencioso en producción
    } finally {
      setLoading(false)
    }
  }, [currentUser?.storeId, dateRange])

  useEffect(() => {
    fetchSales()
  }, [fetchSales, currentUser?.storeId])

  const createSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    if (!currentUser?.id) {
      throw new Error('Usuario no autenticado')
    }

    try {
      const newSale = await SalesService.createSale(saleData, currentUser.id)
      setSales(prev => [newSale, ...prev])
    } catch (error) {
      throw error
    }
  }

  const updateSale = async (id: string, saleData: Partial<Sale>) => {
    if (!currentUser?.id) {
      throw new Error('Usuario no autenticado')
    }

    try {
      const updatedSale = await SalesService.updateSale(id, saleData, currentUser.id)
      setSales(prev => prev.map(sale => sale.id === id ? updatedSale : sale))
    } catch (error) {
      throw error
    }
  }

  const deleteSale = async (id: string) => {
    if (!currentUser?.id) {
      throw new Error('Usuario no autenticado')
    }

    try {
      await SalesService.deleteSale(id, currentUser.id)
      setSales(prev => prev.filter(sale => sale.id !== id))
    } catch (error) {
      throw error
    }
  }

  const cancelSale = async (id: string, reason: string) => {
    if (!currentUser?.id) {
      throw new Error('Usuario no autenticado')
    }

    try {
      const result = await SalesService.cancelSale(id, reason, currentUser.id)

      setSales(prev => {
        const updated = prev.map(sale => 
          sale.id === id 
            ? { ...sale, status: 'cancelled' as const, cancellationReason: reason }
            : sale
        )
        return updated
      })
      
      await fetchSales(currentPage, false, dateRange)

      const cancelledSale = sales.find(sale => sale.id === id)

      if (cancelledSale?.paymentMethod === 'credit') {
        window.dispatchEvent(new CustomEvent('creditCancelled', { 
          detail: { invoiceNumber: cancelledSale.invoiceNumber } 
        }))
      }

      return result
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Product not found')) {
          throw new Error('Error: No se pudo encontrar uno de los productos para devolver al stock. La venta no fue anulada.')
        } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
          throw new Error('Error: Problema con la base de datos. Por favor, contacta al administrador.')
        } else {
          throw new Error(`Error al anular la venta: ${error.message}`)
        }
      }
      
      throw new Error('Error inesperado al anular la venta. Por favor, inténtalo de nuevo.')
    }
  }

  const finalizeDraftSale = async (id: string) => {
    if (!currentUser?.id) {
      throw new Error('Usuario no autenticado')
    }

    try {
      await SalesService.finalizeDraftSale(id, currentUser.id)
      await refreshProducts(undefined, { silent: true })
      await fetchSales(currentPage, false, dateRange)
    } catch (error) {
      throw error
    }
  }

  const searchSales = async (searchTerm: string): Promise<Sale[]> => {
    try {
      return await SalesService.searchSales(searchTerm, toListOptions(dateRange))
    } catch (error) {
      throw error
    }
  }

  const refreshSales = async () => {
    await fetchSales(1, false, dateRange)
  }

  const goToPage = async (page: number) => {
    if (page >= 1 && page <= Math.ceil(totalSales / SALES_PAGE_SIZE) && !loading) {
      await fetchSales(page, false, dateRange)
    }
  }

  const setDateRange = async (range: SalesDateRange) => {
    setDateRangeState(range)
    await fetchSales(1, false, range)
  }

  const clearDateRange = async () => {
    setDateRangeState(emptyDateRange)
    await fetchSales(1, false, emptyDateRange)
  }

  return (
    <SalesContext.Provider value={{
      sales,
      loading,
      currentPage,
      totalSales,
      hasMore,
      createSale,
      updateSale,
      deleteSale,
      cancelSale,
      finalizeDraftSale,
      searchSales,
      refreshSales,
      goToPage,
      dateRange,
      setDateRange,
      clearDateRange,
    }}>
      {children}
    </SalesContext.Provider>
  )
}

export function useSales() {
  const context = useContext(SalesContext)
  if (context === undefined) {
    throw new Error('useSales must be used within a SalesProvider')
  }
  return context
}

'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Warranty } from '@/types'
import { WarrantyService } from '@/lib/warranty-service'
import { useAuth } from './auth-context'

interface WarrantyContextType {
  warranties: Warranty[]
  loading: boolean
  currentPage: number
  totalWarranties: number
  hasMore: boolean
  createWarranty: (warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateWarrantyStatus: (warrantyId: string, newStatus: string, notes?: string) => Promise<void>
  searchWarranties: (searchTerm: string) => Promise<Warranty[]>
  refreshWarranties: () => Promise<void>
  goToPage: (page: number) => Promise<void>
  getWarrantyStats: () => Promise<{
    total: number
    pending: number
    inProgress: number
    completed: number
    rejected: number
    discarded: number
  }>
}

const WarrantyContext = createContext<WarrantyContextType | undefined>(undefined)

export function WarrantyProvider({ children }: { children: ReactNode }) {
  const [warranties, setWarranties] = useState<Warranty[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalWarranties, setTotalWarranties] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const { user: currentUser } = useAuth()

  const fetchWarranties = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setLoading(true)
      const result = await WarrantyService.getAllWarranties(page, 20)
      
      if (append) {
        setWarranties(prev => [...prev, ...result.warranties])
      } else {
        setWarranties(result.warranties)
      }
      
      setCurrentPage(page)
      setTotalWarranties(result.total)
      setHasMore(result.hasMore)
    } catch (error) {
      // Error silencioso en producción
    } finally {
      setLoading(false)
    }
  }, [])

  const createWarranty = useCallback(async (warrantyData: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newWarranty = await WarrantyService.createWarranty({
        ...warrantyData,
        createdBy: currentUser?.id
      })
      
      // Agregar la nueva garantía al inicio de la lista
      setWarranties(prev => [newWarranty, ...prev])
      setTotalWarranties(prev => prev + 1)
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }, [currentUser])

  const updateWarrantyStatus = useCallback(async (warrantyId: string, newStatus: string, notes?: string) => {
    try {
      await WarrantyService.updateWarrantyStatus(warrantyId, newStatus, notes, currentUser?.id)
      
      // Actualizar la garantía en la lista local
      setWarranties(prev => prev.map(warranty => 
        warranty.id === warrantyId 
          ? { 
              ...warranty, 
              status: newStatus as any,
              updatedAt: new Date().toISOString(),
              completedAt: newStatus === 'completed' ? new Date().toISOString() : warranty.completedAt
            }
          : warranty
      ))
    } catch (error) {
      // Error silencioso en producción
      throw error
    }
  }, [currentUser])

  const searchWarranties = useCallback(async (searchTerm: string): Promise<Warranty[]> => {
    try {
      if (!searchTerm.trim()) {
        return warranties
      }
      
      const results = await WarrantyService.searchWarranties(searchTerm)
      return results
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }, [warranties])

  const refreshWarranties = useCallback(async () => {
    await fetchWarranties(1, false)
  }, [fetchWarranties])

  const goToPage = useCallback(async (page: number) => {
    await fetchWarranties(page, false)
  }, [fetchWarranties])

  const getWarrantyStats = useCallback(async () => {
    try {
      return await WarrantyService.getWarrantyStats()
    } catch (error) {
      // Error silencioso en producción
      return {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        rejected: 0,
        discarded: 0
      }
    }
  }, [])

  // Cargar garantías al inicializar y cuando cambie el storeId
  useEffect(() => {
    fetchWarranties(1, false)
  }, [fetchWarranties, currentUser?.storeId])

  const value: WarrantyContextType = {
    warranties,
    loading,
    currentPage,
    totalWarranties,
    hasMore,
    createWarranty,
    updateWarrantyStatus,
    searchWarranties,
    refreshWarranties,
    goToPage,
    getWarrantyStats
  }

  return (
    <WarrantyContext.Provider value={value}>
      {children}
    </WarrantyContext.Provider>
  )
}

export function useWarranties() {
  const context = useContext(WarrantyContext)
  if (context === undefined) {
    throw new Error('useWarranties must be used within a WarrantyProvider')
  }
  return context
}

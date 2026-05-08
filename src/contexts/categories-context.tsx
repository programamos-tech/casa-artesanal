'use client'

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react'
import { Category } from '@/types'
import { CategoriesService } from '@/lib/categories-service'
import { useAuth } from './auth-context'

interface CategoriesContextType {
  categories: Category[]
  loading: boolean
  createCategory: (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>
  updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<boolean>
  toggleCategoryStatus: (id: string, newStatus: 'active' | 'inactive') => Promise<boolean>
  deleteCategory: (id: string) => Promise<boolean>
  searchCategories: (searchTerm: string) => Promise<Category[]>
  refreshCategories: () => Promise<void>
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined)

export const CategoriesProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuth()

  const refreshCategories = async () => {
    setLoading(true)
    const fetchedCategories = await CategoriesService.getAllCategories()
    setCategories(fetchedCategories)
    setLoading(false)
  }

  useEffect(() => {
    refreshCategories()
  }, [])

  const createCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    // Si no hay usuario, usar un ID por defecto para testing
    const userId = currentUser?.id || '00000000-0000-0000-0000-000000000001'
    
    const newCategory = await CategoriesService.createCategory(categoryData, userId)
    
    if (newCategory) {
      setCategories(prev => [newCategory, ...prev])
      return true
    }
    
    return false
  }

  const updateCategory = async (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<boolean> => {
    try {
      const success = await CategoriesService.updateCategory(id, updates, currentUser?.id)
      
      if (success) {
        setCategories(prev => prev.map(category => 
          category.id === id ? { ...category, ...updates } as Category : category
        ))
        return true
      }
      
      return false
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  const toggleCategoryStatus = async (id: string, newStatus: 'active' | 'inactive'): Promise<boolean> => {
    const success = await CategoriesService.updateCategory(id, { status: newStatus }, currentUser?.id)
    if (success) {
      setCategories(prev => prev.map(category => 
        category.id === id ? { ...category, status: newStatus } : category
      ))
      return true
    }
    return false
  }

  const deleteCategory = async (id: string): Promise<boolean> => {
    const success = await CategoriesService.deleteCategory(id, currentUser?.id)
    if (success) {
      setCategories(prev => prev.filter(category => category.id !== id))
      return true
    }
    return false
  }

  const searchCategories = async (searchTerm: string): Promise<Category[]> => {
    setLoading(true)
    const results = await CategoriesService.searchCategories(searchTerm)
    setCategories(results)
    setLoading(false)
    return results
  }

  return (
    <CategoriesContext.Provider value={{ 
      categories, 
      loading, 
      createCategory, 
      updateCategory, 
      toggleCategoryStatus,
      deleteCategory, 
      searchCategories, 
      refreshCategories
    }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export const useCategories = () => {
  const context = useContext(CategoriesContext)
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider')
  }
  return context
}

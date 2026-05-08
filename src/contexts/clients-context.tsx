'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Client } from '@/types'
import { ClientsService } from '@/lib/clients-service'
import { useAuth } from './auth-context'

interface ClientsContextType {
  clients: Client[]
  loading: boolean
  getAllClients: () => Promise<void>
  getClientById: (id: string) => Promise<Client | null>
  createClient: (clientData: Omit<Client, 'id' | 'createdAt'>) => Promise<{ client: Client | null, error: string | null }>
  updateClient: (id: string, updates: Partial<Client>) => Promise<boolean>
  deleteClient: (id: string) => Promise<{ success: boolean; error?: string }>
  searchClients: (query: string) => Promise<Client[]>
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const getAllClients = useCallback(async () => {
    setLoading(true)
    try {
      const clientsData = await ClientsService.getAllClients()
      setClients(clientsData)
    } catch (error) {
      // Error silencioso en producción
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [user?.storeId])

  const getClientById = async (id: string): Promise<Client | null> => {
    try {
      return await ClientsService.getClientById(id)
    } catch (error) {
      // Error silencioso en producción
      return null
    }
  }

  const createClient = async (clientData: Omit<Client, 'id' | 'createdAt'>): Promise<{ client: Client | null, error: string | null }> => {
    try {
      const result = await ClientsService.createClient(clientData, user?.id)
      if (result.client) {
        setClients(prev => [result.client!, ...prev])
      }
      return result
    } catch (error) {
      // Error silencioso en producción
      return { client: null, error: 'Error inesperado al crear el cliente.' }
    }
  }

  const updateClient = async (id: string, updates: Partial<Client>): Promise<boolean> => {
    try {
      const success = await ClientsService.updateClient(id, updates, user?.id)
      if (success) {
        setClients(prev => 
          prev.map(client => 
            client.id === id ? { ...client, ...updates } : client
          )
        )
        return true
      }
      return false
    } catch (error) {
      // Error silencioso en producción
      return false
    }
  }

  const deleteClient = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await ClientsService.deleteClient(id, user?.id)
      if (result.success) {
        setClients(prev => prev.filter(client => client.id !== id))
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (error) {
      return { success: false, error: 'Error inesperado al eliminar' }
    }
  }

  const searchClients = async (query: string): Promise<Client[]> => {
    try {
      return await ClientsService.searchClients(query)
    } catch (error) {
      // Error silencioso en producción
      return []
    }
  }

  // Cargar clientes al inicializar
  useEffect(() => {
    getAllClients()
  }, [getAllClients, user?.storeId])

  return (
    <ClientsContext.Provider value={{
      clients,
      loading,
      getAllClients,
      getClientById,
      createClient,
      updateClient,
      deleteClient,
      searchClients
    }}>
      {children}
    </ClientsContext.Provider>
  )
}

export function useClients() {
  const context = useContext(ClientsContext)
  if (context === undefined) {
    throw new Error('useClients must be used within a ClientsProvider')
  }
  return context
}

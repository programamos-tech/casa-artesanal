'use client'

import { useState, useEffect } from 'react'
import { Store } from '@/types'
import { StoresService } from '@/lib/stores-service'
import { SalesService } from '@/lib/sales-service'
import { toast } from 'sonner'
import { StoreTable } from '@/components/stores/store-table'
import { StoreModal } from '@/components/stores/store-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { useAuth } from '@/contexts/auth-context'
import { canAccessAllStores } from '@/lib/store-helper'

export default function StoresPage() {
  const { user } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [salesByStore, setSalesByStore] = useState<
    Record<string, { revenueToday: number }>
  >({})
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null)

  // Verificar si el usuario puede acceder a esta página
  const canAccess = user && canAccessAllStores(user)

  useEffect(() => {
    if (canAccess) {
      loadStores()
    }
  }, [canAccess, user])

  const loadStores = async () => {
    try {
      setLoading(true)
      const [data, todayRev] = await Promise.all([
        StoresService.getAllStores(),
        SalesService.getTodayCompletedRevenueByStore(),
      ])
      setStores(data)
      const merged: Record<string, { revenueToday: number }> = {}
      for (const s of data) {
        merged[s.id] = { revenueToday: todayRev[s.id] ?? 0 }
      }
      setSalesByStore(merged)
    } catch (error) {
      console.error('Error loading stores:', error)
      toast.error('Error al cargar las tiendas')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (store: Store) => {
    setSelectedStore(store)
    setIsModalOpen(true)
  }

  const handleDelete = (store: Store) => {
    setStoreToDelete(store)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (storeToDelete) {
      try {
        const success = await StoresService.deleteStore(storeToDelete.id)
        if (success) {
          toast.success('Tienda eliminada exitosamente')
          setIsDeleteModalOpen(false)
          setStoreToDelete(null)
          await loadStores()
        } else {
          toast.error('Error eliminando tienda')
        }
      } catch (error) {
        console.error('Error deleting store:', error)
        toast.error('Error eliminando tienda')
      }
    }
  }

  const handleCreate = () => {
    setSelectedStore(null)
    setIsModalOpen(true)
  }

  const handleSaveStore = async (storeData: Omit<Store, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'deletedAt'>) => {
    try {
      if (selectedStore) {
        // Edit existing store
        const updated = await StoresService.updateStore(selectedStore.id, storeData)
        if (updated) {
          toast.success('Tienda actualizada exitosamente')
          setIsModalOpen(false)
          setSelectedStore(null)
          await loadStores()
        } else {
          toast.error('Error actualizando tienda')
        }
      } else {
        // Create new store
        const newStore = await StoresService.createStore(storeData)
        if (newStore) {
          toast.success('Tienda creada exitosamente')
          setIsModalOpen(false)
          await loadStores()
        } else {
          toast.error('Error creando tienda')
        }
      }
    } catch (error) {
      console.error('Error saving store:', error)
      toast.error('Error al guardar la tienda')
    }
  }

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No tienes permisos para acceder a esta página</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400"
          aria-hidden
        />
      </div>
    )
  }

  return (
    <RoleProtectedRoute module="roles" requiredAction="view">
      <div className="min-h-screen space-y-4 bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 py-4 pb-20 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 md:space-y-6 md:py-6 lg:pb-6">
        <StoreTable
          stores={stores}
          salesByStore={salesByStore}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreate={handleCreate}
          onRefresh={loadStores}
        />

        <StoreModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedStore(null)
          }}
          onSave={handleSaveStore}
          store={selectedStore}
        />

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setStoreToDelete(null)
          }}
          onConfirm={confirmDelete}
          title="Eliminar Tienda"
          message={`¿Estás seguro de que quieres eliminar la tienda "${storeToDelete?.name}"? Esta acción desactivará la tienda y no se podrá deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          type="danger"
        />
      </div>
    </RoleProtectedRoute>
  )
}

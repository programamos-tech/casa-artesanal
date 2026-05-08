'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { TransfersTable } from '@/components/inventory/transfers-table'
import { TransferModal } from '@/components/inventory/transfer-modal'
import { StoreStockTransfer, Store, Sale } from '@/types'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { StoresService } from '@/lib/stores-service'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUserStoreId, canAccessAllStores, isMainStoreUser } from '@/lib/store-helper'
import { toast } from 'sonner'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
const PAGE_SIZE = 50

export default function TransfersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [transfers, setTransfers] = useState<StoreStockTransfer[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'cancelled' | 'received'>('all')
  const [transferSales, setTransferSales] = useState<Map<string, Sale>>(new Map())
  const [loadingSalesForList, setLoadingSalesForList] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTransfers, setTotalTransfers] = useState(0)

  const currentStoreId = getCurrentUserStoreId()
  const canManageAllStores = canAccessAllStores(user)
  const isMainStore = isMainStoreUser(user)
  /** Listado global de traslados: admin ve todo; tienda principal igual. */
  const transferListStoreId =
    canManageAllStores || isMainStore ? MAIN_STORE_ID : currentStoreId || null
  /** Origen por defecto del modal: principal si aplica; si no, la tienda actual. */
  const defaultTransferOriginId = isMainStore ? MAIN_STORE_ID : currentStoreId || MAIN_STORE_ID

  useEffect(() => {
    if (user && !isMainStore && !canManageAllStores) {
      window.location.href = '/inventory/receptions'
    }
  }, [user, isMainStore, canManageAllStores])

  useEffect(() => {
    loadStores()
  }, [])

  useEffect(() => {
    loadTransfers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, transferListStoreId, currentPage])

  useEffect(() => {
    if (transfers.length === 0) {
      setTransferSales(new Map())
      setLoadingSalesForList(false)
      return
    }
    let cancelled = false
    setLoadingSalesForList(true)
    ;(async () => {
      try {
        const results = await Promise.all(
          transfers.map(async (t) => {
            try {
              const sale = await StoreStockTransferService.getTransferSale(t.id)
              return [t.id, sale] as const
            } catch {
              return [t.id, null] as const
            }
          })
        )
        if (cancelled) return
        const m = new Map<string, Sale>()
        for (const [id, sale] of results) {
          if (sale) m.set(id, sale)
        }
        setTransferSales(m)
      } finally {
        if (!cancelled) setLoadingSalesForList(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [transfers])

  const loadStores = async () => {
    try {
      const storesData = await StoresService.getAllStores(true)
      setStores(storesData)
    } catch (error) {
      console.error('Error loading stores:', error)
    }
  }

  const loadTransfers = async () => {
    if (!transferListStoreId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await StoreStockTransferService.getStoreTransfers(
        transferListStoreId,
        'all',
        currentPage,
        PAGE_SIZE
      )

      let filteredTransfers = result.transfers
      if (filter === 'pending') {
        filteredTransfers = result.transfers.filter(
          t => t.status === 'pending' || t.status === 'in_transit'
        )
      } else if (filter === 'received') {
        filteredTransfers = result.transfers.filter(
          t => t.status === 'received' || t.status === 'partially_received'
        )
      } else if (filter === 'cancelled') {
        filteredTransfers = result.transfers.filter(t => t.status === 'cancelled')
      }

      setTransfers(filteredTransfers)
      setTotalTransfers(result.total)
    } catch (error) {
      toast.error('Error al cargar las transferencias')
      console.error('Error loading transfers:', error)
    } finally {
      setLoading(false)
    }
  }

  if (user && !isMainStore && !canManageAllStores) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Redirigiendo a recepciones...</p>
      </div>
    )
  }

  return (
    <RoleProtectedRoute module="transfers" requiredAction="view">
      <div className="min-h-screen space-y-4 bg-white py-4 dark:bg-neutral-950 md:space-y-6 md:py-6">
        <TransfersTable
          transfers={transfers}
          transferSales={transferSales}
          loadingSalesForList={loadingSalesForList}
          filter={filter}
          onFilterChange={f => {
            setFilter(f)
            setCurrentPage(1)
          }}
          onRefresh={loadTransfers}
          onCreate={canManageAllStores ? () => setIsCreateModalOpen(true) : undefined}
          canManageAllStores={canManageAllStores}
          onView={t => router.push(`/inventory/transfers/${t.id}`)}
          onOpenSale={saleId => router.push(`/sales/${saleId}`)}
          loading={loading}
          currentPage={currentPage}
          totalTransfers={totalTransfers}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />

        <TransferModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={async () => {
            setIsCreateModalOpen(false)
            await loadTransfers()
          }}
          stores={stores}
          fromStoreId={defaultTransferOriginId}
        />
      </div>
    </RoleProtectedRoute>
  )
}

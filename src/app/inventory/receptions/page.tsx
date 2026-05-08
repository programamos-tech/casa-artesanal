'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { ReceptionsTable } from '@/components/inventory/receptions-table'
import { ReceiveTransferModal } from '@/components/inventory/receive-transfer-modal'
import { StoreStockTransfer, Sale } from '@/types'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { useAuth } from '@/contexts/auth-context'
import { getCurrentUserStoreId, isMainStoreUser } from '@/lib/store-helper'
import { toast } from 'sonner'
import { useProducts } from '@/contexts/products-context'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
const PAGE_SIZE = 50

export default function ReceptionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { refreshProducts } = useProducts()
  const [pendingTransfers, setPendingTransfers] = useState<StoreStockTransfer[]>([])
  const [receivedTransfers, setReceivedTransfers] = useState<StoreStockTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [transferToReceive, setTransferToReceive] = useState<StoreStockTransfer | null>(null)
  const [filter, setFilterState] = useState<'all' | 'pending' | 'received'>('all')
  const [pendingPage, setPendingPage] = useState(1)
  const [receivedPage, setReceivedPage] = useState(1)
  const [pendingTotal, setPendingTotal] = useState(0)
  const [receivedTotal, setReceivedTotal] = useState(0)
  const [pendingHasMore, setPendingHasMore] = useState(false)
  const [receivedHasMore, setReceivedHasMore] = useState(false)
  const [transferSales, setTransferSales] = useState<Map<string, Sale>>(new Map())
  const [loadingSalesForList, setLoadingSalesForList] = useState(false)

  const currentStoreId = getCurrentUserStoreId()
  const isMainStore = isMainStoreUser(user)
  const storeIdToUse = isMainStore ? MAIN_STORE_ID : currentStoreId || null

  const setFilter = (f: 'all' | 'pending' | 'received') => {
    setFilterState(f)
    setPendingPage(1)
    setReceivedPage(1)
  }

  useEffect(() => {
    if (storeIdToUse) {
      loadTransfers()
    }
  }, [storeIdToUse, pendingPage, receivedPage])

  useEffect(() => {
    const combined = [...pendingTransfers, ...receivedTransfers]
    if (combined.length === 0) {
      setTransferSales(new Map())
      setLoadingSalesForList(false)
      return
    }
    let cancelled = false
    setLoadingSalesForList(true)
    ;(async () => {
      try {
        const fromMain = combined.filter(t => t.fromStoreId === MAIN_STORE_ID)
        const seen = new Set<string>()
        const unique = fromMain.filter(t => {
          if (seen.has(t.id)) return false
          seen.add(t.id)
          return true
        })
        const results = await Promise.all(
          unique.map(async t => {
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
  }, [pendingTransfers, receivedTransfers])

  const loadTransfers = async () => {
    if (!storeIdToUse) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [pendingResult, receivedResult] = await Promise.all([
        StoreStockTransferService.getPendingTransfers(storeIdToUse, pendingPage, PAGE_SIZE),
        StoreStockTransferService.getReceivedTransfers(storeIdToUse, receivedPage, PAGE_SIZE),
      ])
      setPendingTransfers(pendingResult.transfers)
      setReceivedTransfers(receivedResult.transfers)
      setPendingTotal(pendingResult.total)
      setReceivedTotal(receivedResult.total)
      setPendingHasMore(pendingResult.hasMore)
      setReceivedHasMore(receivedResult.hasMore)
    } catch (error) {
      toast.error('Error al cargar las transferencias')
      console.error('Error loading transfers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReceive = (transfer: StoreStockTransfer) => {
    setTransferToReceive(transfer)
    setIsReceiveModalOpen(true)
  }

  const confirmReceive = async (receivedItems: Array<{ itemId: string; quantityReceived: number; note?: string }>) => {
    if (!transferToReceive || !user) return

    try {
      const success = await StoreStockTransferService.receiveTransfer(
        transferToReceive.id,
        user.id,
        user.name,
        receivedItems
      )
      if (success) {
        toast.success('Transferencia recibida exitosamente. El stock ha sido actualizado.')
        setIsReceiveModalOpen(false)
        setTransferToReceive(null)
        await loadTransfers()
        await refreshProducts()
      } else {
        toast.error('Error al recibir la transferencia')
      }
    } catch (error) {
      toast.error('Error al recibir la transferencia')
      console.error('Error receiving transfer:', error)
    }
  }

  return (
    <RoleProtectedRoute module="receptions" requiredAction="view">
      <div className="min-h-screen space-y-4 bg-white py-4 dark:bg-neutral-950 md:space-y-6 md:py-6">
        <ReceptionsTable
          filter={filter}
          onFilterChange={setFilter}
          onRefresh={loadTransfers}
          loading={loading}
          transferSales={transferSales}
          loadingSalesForList={loadingSalesForList}
          pendingTransfers={pendingTransfers}
          receivedTransfers={receivedTransfers}
          pendingPage={pendingPage}
          receivedPage={receivedPage}
          pendingTotal={pendingTotal}
          receivedTotal={receivedTotal}
          pendingHasMore={pendingHasMore}
          receivedHasMore={receivedHasMore}
          pageSize={PAGE_SIZE}
          onPendingPageChange={setPendingPage}
          onReceivedPageChange={setReceivedPage}
          onReceive={handleReceive}
          onViewTransfer={t => router.push(`/inventory/transfers/${t.id}`)}
          onOpenSale={saleId => router.push(`/sales/${saleId}`)}
        />

        <ReceiveTransferModal
          isOpen={isReceiveModalOpen}
          onClose={() => {
            setIsReceiveModalOpen(false)
            setTransferToReceive(null)
          }}
          onConfirm={confirmReceive}
          transfer={transferToReceive}
        />
      </div>
    </RoleProtectedRoute>
  )
}

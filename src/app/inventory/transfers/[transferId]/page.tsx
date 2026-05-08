'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { TransferDetailPageView } from '@/components/inventory/transfer-detail-page-view'
import { CancelTransferModal } from '@/components/ui/cancel-transfer-modal'
import { StoreStockTransfer, Sale } from '@/types'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { useAuth } from '@/contexts/auth-context'
import { isMainStoreUser } from '@/lib/store-helper'
import { PDFService } from '@/lib/pdf-service'
import { toast } from 'sonner'

export default function TransferDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const transferId = params.transferId as string

  const [transfer, setTransfer] = useState<StoreStockTransfer | null>(null)
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSale, setLoadingSale] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const isMainStore = isMainStoreUser(user)
  const accessModule = isMainStore ? 'transfers' : 'receptions'
  const backHref = isMainStore ? '/inventory/transfers' : '/inventory/receptions'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const load = useCallback(async () => {
    if (!transferId) return
    setLoading(true)
    setNotFound(false)
    setSale(null)
    try {
      const t = await StoreStockTransferService.getTransferById(transferId)
      if (!t) {
        setTransfer(null)
        setNotFound(true)
        return
      }
      setTransfer(t)
      setLoadingSale(true)
      try {
        const s = await StoreStockTransferService.getTransferSale(transferId)
        setSale(s)
      } catch {
        setSale(null)
      } finally {
        setLoadingSale(false)
      }
    } catch {
      setTransfer(null)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [transferId])

  useEffect(() => {
    load()
  }, [load])

  const handleDownloadPdf = async () => {
    if (!transfer) return
    try {
      toast.loading('Generando PDF...')
      await PDFService.generateTransferPDF(transfer, {
        logoUrl: '/logo.ya.png',
        companyName: transfer.fromStoreName || 'Zona T',
        companyAddress: '',
        companyPhone: '',
      })
      toast.dismiss()
      toast.success('PDF generado')
    } catch {
      toast.dismiss()
      toast.error('Error al generar el PDF')
    }
  }

  const confirmCancel = async (reason: string) => {
    if (!transfer || !user?.id) return
    setCancelling(true)
    try {
      const result = await StoreStockTransferService.cancelTransfer(transfer.id, reason, user.id)
      if (result.success) {
        toast.success('Transferencia cancelada')
        setCancelOpen(false)
        await load()
      } else {
        toast.error('No se pudo cancelar')
      }
    } catch {
      toast.error('Error al cancelar')
    } finally {
      setCancelling(false)
    }
  }

  const canCancel =
    !!transfer &&
    (transfer.status === 'pending' || transfer.status === 'in_transit') &&
    isMainStore

  if (loading) {
    return (
      <RoleProtectedRoute module={accessModule} requiredAction="view">
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white py-24 dark:bg-zinc-950">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-sm text-zinc-500">Cargando transferencia…</p>
        </div>
      </RoleProtectedRoute>
    )
  }

  if (notFound || !transfer) {
    return (
      <RoleProtectedRoute module={accessModule} requiredAction="view">
        <div className="min-h-screen bg-white px-4 py-16 dark:bg-zinc-950">
          <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">Transferencia no encontrada</p>
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Volver
            </button>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute module={accessModule} requiredAction="view">
      <div className="min-h-screen bg-white dark:bg-zinc-950">
        <TransferDetailPageView
          transfer={transfer}
          sale={sale}
          loadingSale={loadingSale}
          formatCurrency={formatCurrency}
          onBack={() => router.push(backHref)}
          onDownloadPdf={handleDownloadPdf}
          onRequestCancel={canCancel ? () => setCancelOpen(true) : undefined}
          canCancel={canCancel}
        />
        <CancelTransferModal
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          onConfirm={confirmCancel}
          transferNumber={transfer.transferNumber || transfer.id.substring(0, 8)}
          isLoading={cancelling}
        />
      </div>
    </RoleProtectedRoute>
  )
}

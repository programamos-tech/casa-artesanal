'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { SaleDetailPageView } from '@/components/sales/sale-detail-page-view'
import { useSales } from '@/contexts/sales-context'
import { Sale } from '@/types'
import { SalesService } from '@/lib/sales-service'
import { printSaleTicket } from '@/lib/sales-print-ticket'

export default function SaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const saleId = params.saleId as string

  const { cancelSale, finalizeDraftSale } = useSales()

  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(async () => {
    if (!saleId) return
    setLoading(true)
    setNotFound(false)
    try {
      const data = await SalesService.getSaleById(saleId)
      if (!data) {
        setSale(null)
        setNotFound(true)
      } else {
        setSale(data)
        setNotFound(false)
      }
    } catch {
      setSale(null)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [saleId])

  useEffect(() => {
    load()
  }, [load])

  const handlePrint = async (s: Sale) => {
    await printSaleTicket(s)
  }

  const handleCancelSale = async (id: string, reason: string) => {
    const result = await cancelSale(id, reason)
    setSale((prev) =>
      prev
        ? { ...prev, status: 'cancelled' as const, cancellationReason: reason }
        : prev
    )
    return result
  }

  const handleFinalizeDraft = async (id: string) => {
    await finalizeDraftSale(id)
    await load()
  }

  if (loading) {
    return (
      <RoleProtectedRoute module="sales" requiredAction="view">
        <div className="flex flex-col items-center justify-center gap-3 py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando venta…</p>
        </div>
      </RoleProtectedRoute>
    )
  }

  if (notFound || !sale) {
    return (
      <RoleProtectedRoute module="sales" requiredAction="view">
        <div className="py-16 text-center">
          <p className="text-base font-semibold text-zinc-900 dark:text-white">Venta no encontrada</p>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-white/50">No existe o no tienes acceso.</p>
          <button
            type="button"
            onClick={() => router.push('/sales')}
            className="mt-5 inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3.5 text-[13px] font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Volver al listado
          </button>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute module="sales" requiredAction="view">
      <SaleDetailPageView
        sale={sale}
        onBack={() => router.push('/sales')}
        onPrint={handlePrint}
        onCancel={handleCancelSale}
        onEditDraft={(draft) => router.push(`/sales/new?draft=${draft.id}`)}
        onFinalizeDraft={handleFinalizeDraft}
      />
    </RoleProtectedRoute>
  )
}

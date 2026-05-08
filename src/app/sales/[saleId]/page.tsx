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

  const { cancelSale, refreshSales } = useSales()

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
    await refreshSales()
    await load()
    return result
  }

  if (loading) {
    return (
      <RoleProtectedRoute module="sales" requiredAction="view">
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 py-24 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando venta…</p>
        </div>
      </RoleProtectedRoute>
    )
  }

  if (notFound || !sale) {
    return (
      <RoleProtectedRoute module="sales" requiredAction="view">
        <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 px-4 py-16 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
          <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">Venta no encontrada</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No existe o no tienes acceso.</p>
            <button
              type="button"
              onClick={() => router.push('/sales')}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Volver al listado
            </button>
          </div>
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
      />
    </RoleProtectedRoute>
  )
}

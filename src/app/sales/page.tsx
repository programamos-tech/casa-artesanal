'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SalesTable } from '@/components/sales/sales-table'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { useSales } from '@/contexts/sales-context'
import { Sale } from '@/types'
import { printSaleTicket } from '@/lib/sales-print-ticket'

export default function SalesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFromUrl = searchParams.get('status') || 'all'
  const {
    sales,
    loading,
    currentPage,
    totalSales,
    hasMore,
    deleteSale,
    goToPage,
    searchSales,
    refreshSales,
  } = useSales()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return

    const selectedInvoice = sessionStorage.getItem('selectedInvoice')
    if (selectedInvoice) {
      const foundSale = sales.find((sale) =>
        sale.invoiceNumber?.toLowerCase().includes(selectedInvoice.toLowerCase())
      )
      if (foundSale) {
        router.push(`/sales/${foundSale.id}`)
        sessionStorage.removeItem('selectedInvoice')
      }
    }
  }, [sales, isMounted, router])

  const handleEdit = (sale: Sale) => {
    if (sale.status === 'draft') {
      router.push(`/sales/new?draft=${sale.id}`)
    }
  }

  const handleDelete = async (sale: Sale) => {
    if (confirm(`¿Estás seguro de que quieres eliminar la venta #${sale.id}?`)) {
      try {
        await deleteSale(sale.id)
      } catch {
        alert('Error al eliminar la venta')
      }
    }
  }

  const handleView = (sale: Sale) => {
    router.push(`/sales/${sale.id}`)
  }

  const handleRefresh = async () => {
    await refreshSales()
  }

  const handleCreate = () => {
    router.push('/sales/new')
  }

  const handlePrint = async (sale: Sale) => {
    await printSaleTicket(sale)
  }

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center bg-white py-6 dark:bg-neutral-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-gray-500 dark:border-brand-500" />
          <p className="text-gray-600 dark:text-gray-300">Cargando ventas...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleProtectedRoute module="sales" requiredAction="view">
      <div className="max-xl:pb-1 space-y-4 bg-white py-4 dark:bg-neutral-950 md:space-y-6 md:py-6">
        <SalesTable
          sales={sales}
          loading={loading}
          currentPage={currentPage}
          totalSales={totalSales}
          hasMore={hasMore}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          onCreate={handleCreate}
          onPrint={handlePrint}
          onPageChange={goToPage}
          onSearch={searchSales}
          onRefresh={handleRefresh}
          initialStatusFilter={statusFromUrl}
        />
      </div>
    </RoleProtectedRoute>
  )
}

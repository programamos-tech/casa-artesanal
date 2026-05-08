'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SalesTable } from '@/components/sales/sales-table'
import { SaleModal } from '@/components/sales/sale-modal'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { useSales } from '@/contexts/sales-context'
import { Sale } from '@/types'
import { printSaleTicket } from '@/lib/sales-print-ticket'

export default function SalesPage() {
  const router = useRouter()
  const { 
    sales, 
    loading, 
    currentPage, 
    totalSales, 
    hasMore, 
    createSale, 
    updateSale,
    deleteSale, 
    finalizeDraftSale,
    goToPage,
    searchSales,
    refreshSales
  } = useSales()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Marcar como montado para evitar errores de hidratación
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Verificar si hay una factura seleccionada en sessionStorage (solo en cliente)
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return
    
    const selectedInvoice = sessionStorage.getItem('selectedInvoice')
    if (selectedInvoice) {
      // Buscar la venta correspondiente a esta factura
      const foundSale = sales.find(sale =>
        sale.invoiceNumber?.toLowerCase().includes(selectedInvoice.toLowerCase())
      )
      if (foundSale) {
        router.push(`/sales/${foundSale.id}`)
        sessionStorage.removeItem('selectedInvoice')
      }
    }
  }, [sales, isMounted, router])

  const handleEdit = (sale: Sale) => {
    // Solo permitir editar borradores
    if (sale.status === 'draft') {
      setSaleToEdit(sale)
      setIsModalOpen(true)
    }
  }

  const handleDelete = async (sale: Sale) => {
    if (confirm(`¿Estás seguro de que quieres eliminar la venta #${sale.id}?`)) {
      try {
        await deleteSale(sale.id)
      } catch (error) {
      // Error silencioso en producción
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

  const handleUpdateSale = async (id: string, saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      // Convertir a Partial<Sale> para el contexto
      await updateSale(id, saleData as Partial<Sale>)
      setIsModalOpen(false)
      setSaleToEdit(null)
      await refreshSales()
    } catch (error) {
      // Error silencioso en producción
      alert('Error al actualizar el borrador')
    }
  }

  const handleSaveSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    try {
      await createSale(saleData)
      setIsModalOpen(false)
    } catch (error) {
      // Error silencioso en producción
      alert('Error al crear la venta')
    }
  }

  const handlePrint = async (sale: Sale) => {
    await printSaleTicket(sale)
  }

  const handleFinalizeDraft = async (saleId: string) => {
    try {
      await finalizeDraftSale(saleId)
    } catch (error: any) {
      const errorMessage = error?.message || 'Error al facturar el borrador'
      if (errorMessage.includes('No hay suficiente stock')) {
        alert(`⚠️ ${errorMessage}\n\nPor favor, verifica el inventario antes de finalizar el borrador.`)
      } else {
        alert(`Error al facturar el borrador: ${errorMessage}`)
      }
      throw error
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center bg-white py-6 dark:bg-neutral-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500 dark:border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Cargando ventas...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleProtectedRoute module="sales" requiredAction="view">
      <div className="space-y-4 bg-white py-4 dark:bg-neutral-950 max-xl:pb-1 md:space-y-6 md:py-6">
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
      />

      <SaleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSaleToEdit(null)
        }}
        onSave={handleSaveSale}
        sale={saleToEdit}
        onUpdate={handleUpdateSale}
      />
    </div>
    </RoleProtectedRoute>
  )
}

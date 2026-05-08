'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CreditTable } from '@/components/payments/payment-table'
import { CreditModal } from '@/components/credits/credit-modal'
import { PaymentModal } from '@/components/credits/payment-modal'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { aggregateCreditsDisplayStatus } from '@/lib/credit-status-ui'
import { Credit, PaymentRecord } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { useAuth } from '@/contexts/auth-context'

export default function CreditsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [credits, setCredits] = useState<Credit[]>([])
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [initialSearch, setInitialSearch] = useState('')

  // Cargar créditos al montar el componente
  useEffect(() => {
    loadCredits()
  }, [])
  
  // Escuchar cambios en el storeId del usuario y recargar créditos
  useEffect(() => {
    if (user) {
      loadCredits()
    }
  }, [user?.storeId])

  // Manejar parámetros de búsqueda de la URL
  useEffect(() => {
    const search = searchParams.get('search')
    if (search) {
      setInitialSearch(search)
    }
  }, [searchParams])


  // Escuchar eventos de crédito cancelado para refrescar la vista
  useEffect(() => {

    const handleCreditCancelled = (event: CustomEvent) => {
      loadCredits()
    }

    window.addEventListener('creditCancelled', handleCreditCancelled as EventListener)

    return () => {

      window.removeEventListener('creditCancelled', handleCreditCancelled as EventListener)
    }
  }, [])

  const loadCredits = async () => {
    try {
      setIsLoading(true)
      // Solo cargar créditos - no cargar payment records aquí (se cargarán cuando se necesiten)
      const creditsData = await CreditsService.getAllCredits()
      
      // Agrupar créditos por cliente
      const groupedCredits = creditsData.reduce((acc, credit) => {
        const key = credit.clientId
        if (!acc[key]) {
          acc[key] = {
            clientId: credit.clientId,
            clientName: credit.clientName,
            credits: [],
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
          }
        }
        acc[key].credits.push(credit)
        acc[key].totalAmount += credit.totalAmount
        acc[key].paidAmount += credit.paidAmount
        acc[key].pendingAmount += credit.pendingAmount

        return acc
      }, {} as Record<string, any>)
      
      // Convertir a array
      const consolidated = Object.values(groupedCredits).map(group => ({
        ...group,
        status: aggregateCreditsDisplayStatus(group.credits),
        // Usar el primer crédito como referencia principal
        id: group.credits[0].id,
        invoiceNumber: `${group.credits.length} factura${group.credits.length > 1 ? 's' : ''}`,
        dueDate: group.credits.sort((a: any, b: any) => 
          new Date(b.dueDate || '').getTime() - new Date(a.dueDate || '').getTime()
        )[0]?.dueDate,
        lastPaymentDate: group.credits.sort((a: any, b: any) => 
          new Date(b.lastPaymentDate || '').getTime() - new Date(a.lastPaymentDate || '').getTime()
        )[0]?.lastPaymentDate,
        lastPaymentAmount: group.credits[0].lastPaymentAmount,
        lastPaymentUser: group.credits[0].lastPaymentUser,
        createdAt: group.credits[0].createdAt
      }))
      
      setCredits(consolidated as Credit[])
    } catch (error) {
      // Error silencioso en producción
      // Si es un error de tabla no encontrada, mostrar mensaje más útil
      if (error instanceof Error && error.message.includes('relation "credits" does not exist')) {

        setCredits([]) // Mostrar lista vacía en lugar de error
      } else {
        setCredits([]) // En caso de otros errores, mostrar lista vacía
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleView = async (credit: Credit) => {
    // Navegar a la página del cliente
    router.push(`/payments/${credit.clientId}`)
  }



  const handleRefresh = async () => {
    await loadCredits()
  }

  const handleCreate = () => {
    setIsCreditModalOpen(true)
  }

  const handleCreateCredit = async (credit: Credit) => {
    // Recargar créditos para agrupar automáticamente
    await loadCredits()
    setIsCreditModalOpen(false)
  }

  const handleAddPayment = async (paymentData: Partial<PaymentRecord>) => {
    if (!selectedCredit) return

    try {
      // Crear el registro de pago
      const paymentRecord = await CreditsService.createPaymentRecord({
        creditId: selectedCredit.id,
        amount: paymentData.amount!,
        paymentDate: paymentData.paymentDate!,
        paymentMethod: paymentData.paymentMethod!,
        cashAmount: paymentData.cashAmount,
        transferAmount: paymentData.transferAmount,
        description: paymentData.description,
        userId: paymentData.userId,
        userName: paymentData.userName
      })

      // Actualizar el crédito
      const paymentAmount = paymentData.amount!
      const newPaidAmount = selectedCredit.paidAmount + paymentAmount
      const newPendingAmount = selectedCredit.pendingAmount - paymentAmount
      const newStatus = newPendingAmount <= 0 ? 'completed' : 'partial'

      const updatedCredit = await CreditsService.updateCredit(selectedCredit.id, {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        status: newStatus,
        lastPaymentAmount: paymentAmount,
        lastPaymentDate: paymentData.paymentDate!,
        lastPaymentUser: paymentRecord.userId!
      })

      // Actualizar el estado local
      setCredits(prev => prev.map(credit => 
        credit.id === selectedCredit.id ? updatedCredit : credit
      ))

      setIsPaymentModalOpen(false)
      setSelectedCredit(null)
      
      // Recargar créditos para actualizar la vista
      await loadCredits()
    } catch (error) {
      // Error silencioso en producción
      // Error silencioso en producción
      let errorMessage = 'Error al agregar el pago. Por favor intenta de nuevo.'
      
      if (error instanceof Error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          errorMessage = 'Error: La tabla de pagos no existe. Contacta al administrador.'
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Error: Monto insuficiente para el pago.'
        } else {
          errorMessage = `Error: ${error.message}`
        }
      }
      
      alert(errorMessage)
    }
  }

  // Calcular total de créditos otorgados hoy (dinero en crédito dado hoy)
  const todayPaymentsTotal = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return credits
      .filter(credit => {
        const creditDate = new Date(credit.createdAt)
        return creditDate >= today && creditDate < tomorrow && 
               credit.status !== 'cancelled'
      })
      .reduce((sum, credit) => sum + (credit.totalAmount || 0), 0)
  }, [credits])

  return (
    <RoleProtectedRoute module="payments" requiredAction="view">
      <div className="space-y-6 bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 py-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 max-xl:pb-1">
      <CreditTable
        todayPaymentsTotal={todayPaymentsTotal}
        credits={credits}
        onView={handleView}
        onCreate={handleCreate}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      <CreditModal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        onCreateCredit={handleCreateCredit}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
        }}
        onAddPayment={handleAddPayment}
        credit={selectedCredit}
      />
    </div>
    </RoleProtectedRoute>
  )
}

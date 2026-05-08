'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  CreditCard, 
  User, 
  Calendar, 
  DollarSign, 
  Receipt, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Plus,
  Check,
  Landmark,
  Wallet,
} from 'lucide-react'
import { Credit, PaymentRecord } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { cn } from '@/lib/utils'
import {
  creditStatusSolidBadgeClass,
  creditStatusIconClass,
  creditStatusLabel,
  getEffectiveCreditStatus,
  isCreditCancelled,
} from '@/lib/credit-status-ui'

interface CreditDetailModalProps {
  isOpen: boolean
  onClose: () => void
  credit: Credit | null
  clientCredits?: Credit[]
  onAddPayment: (credit: Credit) => void
  onViewSale?: (invoiceNumber: string) => void
}

export function CreditDetailModal({ isOpen, onClose, credit, clientCredits = [], onAddPayment, onViewSale }: CreditDetailModalProps) {
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCreditId, setSelectedCreditId] = useState<string>('')
  const [loadedCreditId, setLoadedCreditId] = useState<string>('') // Track qué crédito ya cargamos

  // Obtener el crédito actualmente seleccionado
  const currentCredit = clientCredits.find(c => c.id === selectedCreditId) || credit
  const currentDisplayStatus = currentCredit
    ? getEffectiveCreditStatus(currentCredit)
    : 'pending'

  useEffect(() => {
    if (isOpen && credit) {
      setSelectedCreditId(credit.id)
    } else if (!isOpen) {
      // Limpiar cuando se cierra el modal
      setPaymentHistory([])
      setLoadedCreditId('')
    }
  }, [isOpen, credit])
  
  useEffect(() => {
    if (isOpen && currentCredit && currentCredit.id) {
      // Solo cargar si no hemos cargado este crédito antes
      if (loadedCreditId !== currentCredit.id) {
        loadPaymentHistory()
      }
    }
  }, [isOpen, currentCredit?.id, loadedCreditId])

  // Forzar re-render cuando cambie la selección
  useEffect(() => {

    if (selectedCreditId && clientCredits.length > 0) {
      const newCredit = clientCredits.find(c => c.id === selectedCreditId)

    }
  }, [selectedCreditId, clientCredits])

  const loadPaymentHistory = async () => {
    if (!currentCredit || !currentCredit.id) return
    
    // Si ya cargamos este crédito, no cargar de nuevo
    if (loadedCreditId === currentCredit.id) return
    
    setIsLoading(true)
    try {
      const history = await CreditsService.getPaymentHistory(currentCredit.id)
      setPaymentHistory(history)
      setLoadedCreditId(currentCredit.id) // Marcar como cargado
    } catch (error) {
      // Error silencioso en producción
      setPaymentHistory([])
      setLoadedCreditId(currentCredit.id) // Marcar como intentado para evitar loops
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string, credit?: Credit | null) => {
    const ic = creditStatusIconClass(status, credit ?? undefined, 'md')
    if (isCreditCancelled(credit ?? undefined)) {
      return <XCircle className={ic} />
    }
    switch (status) {
      case 'completed':
        return <CheckCircle className={ic} />
      case 'partial':
        return <Clock className={ic} />
      case 'pending':
        return <AlertCircle className={ic} />
      case 'overdue':
        return <XCircle className={ic} />
      case 'cancelled':
        return <XCircle className={ic} />
      default:
        return <AlertCircle className={ic} />
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />
      case 'transfer':
        return <Landmark className="h-4 w-4" />
      case 'card':
        return <Wallet className="h-4 w-4" />
      case 'mixed':
        return <CreditCard className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100 hover:text-green-800'
      case 'transfer':
        return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 hover:text-orange-800'
      case 'card':
        return 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100 hover:text-amber-900'
      case 'mixed':
        return 'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-100 hover:text-violet-800'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100 hover:text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const getDueDateColor = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return 'text-red-600 dark:text-red-400 font-bold'
    } else if (diffDays <= 7) {
      return 'text-orange-600 dark:text-orange-400 font-bold'
    } else {
      return 'text-green-600 dark:text-green-400 font-bold'
    }
  }

  if (!isOpen || !credit) return null

  return (
    <div className="fixed inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-50 flex flex-col p-4 xl:px-6">
      <div className="bg-white dark:bg-neutral-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-auto xl:w-auto xl:max-w-[98vw] xl:max-h-[90vh] xl:m-auto flex flex-col border-0 xl:border border-gray-200 dark:border-neutral-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-neutral-600 flex-shrink-0 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-6 w-6 text-orange-600" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Detalle de Crédito</h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{currentCredit?.invoiceNumber}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-neutral-900">
          <div className="space-y-4 md:space-y-6">
            {clientCredits.length > 1 && (
              <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-white flex items-center">
                    <User className="h-5 w-5 md:h-6 md:w-6 mr-2 text-orange-600" />
                    Todos los Créditos de {credit.clientName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="overflow-x-auto">
                    <div className="min-w-full">
                      <div className="grid grid-cols-1 gap-3">
                        {clientCredits.map((c) => {
                          const isSelected = selectedCreditId === c.id
                          const displayStatus = getEffectiveCreditStatus(c)
                          const bgColor = isSelected 
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-400 dark:border-orange-500' 
                            : 'bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-600'
                          
                          return (
                            <div
                              key={c.id} 
                              onClick={() => setSelectedCreditId(c.id)}
                              className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${bgColor}`}
                            >
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                                <div className="flex items-center gap-3">
                                  <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Factura</div>
                                    <div className="text-base font-mono font-semibold text-blue-600 dark:text-blue-400">
                                      {c.invoiceNumber}
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado</div>
                                  <Badge
                                    className={cn(
                                      creditStatusSolidBadgeClass(displayStatus, c),
                                      'flex w-fit items-center gap-1 text-sm'
                                    )}
                                  >
                                    {getStatusIcon(displayStatus, c)}
                                    {creditStatusLabel(displayStatus, c)}
                                  </Badge>
                                </div>
                                
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
                                  <div className="text-base font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(c.totalAmount)}
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pagado</div>
                                  <div className="text-base font-semibold text-green-600 dark:text-green-400">
                                    {formatCurrency(c.paidAmount || 0)}
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pendiente</div>
                                  <div className={`text-base font-semibold ${
                                    c.pendingAmount === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {formatCurrency(c.pendingAmount)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Información del Crédito y Historial de Abonos - Siempre visible */}
            {currentCredit && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Información del Crédito */}
                <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 shadow-sm lg:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-white flex items-center">
                      <Receipt className="h-5 w-5 md:h-6 md:w-6 mr-2 text-orange-600" />
                      Información del Crédito
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Receipt className="h-6 w-6 text-orange-600 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Factura</div>
                          <div className="font-bold text-orange-600 text-xl">{currentCredit?.invoiceNumber}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 pt-3 border-t border-gray-200 dark:border-neutral-600">
                        <User className="h-6 w-6 text-orange-600 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Cliente</div>
                          <div className="font-semibold text-base text-gray-900 dark:text-white">{currentCredit?.clientName}</div>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-200 dark:border-neutral-600 space-y-3">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(currentCredit?.totalAmount || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pagado</div>
                          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(currentCredit?.paidAmount || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pendiente</div>
                          <div className={`text-lg font-semibold ${
                            currentCredit?.pendingAmount === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatCurrency(currentCredit?.pendingAmount || 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Estado</div>
                          <Badge
                            className={cn(
                              creditStatusSolidBadgeClass(currentDisplayStatus, currentCredit),
                              'flex w-fit items-center gap-1 px-3 py-1 text-sm'
                            )}
                          >
                            {getStatusIcon(currentDisplayStatus, currentCredit)}
                            {creditStatusLabel(currentDisplayStatus, currentCredit)}
                          </Badge>
                        </div>
                      </div>
                      
                      {currentCredit?.dueDate && (
                        <div className="flex items-center space-x-3 pt-3 border-t border-gray-200 dark:border-neutral-600">
                          <Calendar className="h-6 w-6 text-orange-600 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Vencimiento</div>
                            <div className={`font-semibold text-base ${getDueDateColor(currentCredit.dueDate)}`}>
                              {formatDate(currentCredit.dueDate)}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {currentCredit?.createdByName && (
                        <div className="flex items-center space-x-3 pt-3 border-t border-gray-200 dark:border-neutral-600">
                          <User className="h-6 w-6 text-orange-600 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Registrado por</div>
                            <div className="font-semibold text-base text-gray-900 dark:text-white">{currentCredit.createdByName}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Historial de Abonos */}
                <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 shadow-sm lg:col-span-2">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <CardTitle className="text-lg md:text-xl text-gray-900 dark:text-white flex items-center">
                        <CreditCard className="h-5 w-5 md:h-6 md:w-6 mr-2 text-orange-600" />
                        Historial de Abonos
                      </CardTitle>
                      <Button 
                        onClick={() => {
                          if (currentCredit) {
                            onAddPayment(currentCredit)
                          }
                        }}
                        disabled={!currentCredit || currentCredit?.status === 'cancelled' || isCreditCancelled(currentCredit)}
                        size="sm"
                        className={`w-full sm:w-auto ${
                          !currentCredit || currentCredit?.status === 'cancelled' || isCreditCancelled(currentCredit)
                            ? 'bg-gray-400 hover:bg-gray-400 text-gray-200 cursor-not-allowed' 
                            : 'bg-orange-600 hover:bg-orange-700 text-white'
                        }`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {!currentCredit || currentCredit?.status === 'cancelled' || isCreditCancelled(currentCredit) ? 'Crédito Anulado' : 'Nuevo Abono'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
                      </div>
                    ) : paymentHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-base text-gray-500 dark:text-gray-400">No hay abonos registrados</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {paymentHistory.map((payment) => (
                          <div
                            key={payment.id}
                            className={`border rounded-lg p-4 ${
                              currentCredit?.status === 'cancelled' 
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                                : 'bg-gray-50 dark:bg-neutral-800/50 border-gray-200 dark:border-neutral-600'
                            } shadow-sm`}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                              <div className="flex items-center gap-3">
                                <DollarSign className={`h-6 w-6 flex-shrink-0 ${
                                  currentCredit?.status === 'cancelled' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                                }`} />
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monto</div>
                                  <div className={`text-xl font-bold ${
                                    currentCredit?.status === 'cancelled' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {formatCurrency(payment.amount)}
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Método de Pago</div>
                                <Badge className={`${getPaymentMethodColor(payment.paymentMethod)} flex items-center gap-1 w-fit text-sm px-3 py-1`}>
                                  {getPaymentMethodIcon(payment.paymentMethod)}
                                  {payment.paymentMethod === 'cash' ? 'Efectivo' :
                                   payment.paymentMethod === 'transfer' ? 'Transferencia (Nequi · Bancolombia)' :
                                   payment.paymentMethod === 'card' ? 'Tarjeta' :
                                   payment.paymentMethod === 'mixed' ? 'Mixto' : payment.paymentMethod}
                                </Badge>
                              </div>
                              
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Registrado por</div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">{payment.userName}</div>
                              </div>
                              
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fecha</div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {new Date(payment.paymentDate).toLocaleString('es-CO')}
                                </div>
                              </div>
                            </div>
                            
                            {payment.description && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-600">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Descripción</div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {payment.description}
                                </p>
                              </div>
                            )}
                            
                            {currentCredit?.status === 'cancelled' && (
                              <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1 w-fit">
                                  <XCircle className="h-4 w-4" />
                                  Anulado
                                </Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between bg-white p-4 pt-6 dark:bg-neutral-950 md:p-6 sticky bottom-0">
          <div className="flex-1"></div>
          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

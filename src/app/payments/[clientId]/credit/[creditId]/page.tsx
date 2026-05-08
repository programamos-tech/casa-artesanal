'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Landmark,
  Wallet,
} from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Credit, PaymentRecord } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { PaymentModal } from '@/components/credits/payment-modal'
import { UserAvatar } from '@/components/ui/user-avatar'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'
import {
  creditStatusBadgeClass,
  creditStatusIconClass,
  creditStatusLabel,
  getEffectiveCreditStatus,
  isCreditCancelled,
} from '@/lib/credit-status-ui'

function getCreditDescription(credit: Credit): string {
  const clientInitials = credit.clientName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2)
    .padEnd(2, 'X')
  const creditSuffix = credit.id.substring(credit.id.length - 6).toLowerCase()
  return `${clientInitials}${creditSuffix}`
}

export default function CreditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  const creditId = params.creditId as string

  const [credit, setCredit] = useState<Credit | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

  const getDueDateClass = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return 'font-medium tabular-nums text-zinc-800 dark:text-zinc-200'
    if (diffDays <= 7) return 'font-medium tabular-nums text-zinc-700 dark:text-zinc-300'
    return 'tabular-nums text-zinc-600 dark:text-zinc-400'
  }

  const getStatusIcon = (status: string, c?: Credit) => {
    const ic = creditStatusIconClass(status, c)
    if (c && isCreditCancelled(c)) {
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
    const ic = 'h-3.5 w-3.5 shrink-0'
    switch (method) {
      case 'cash':
        return <DollarSign className={ic} strokeWidth={1.5} />
      case 'transfer':
        return <Landmark className={ic} strokeWidth={1.5} />
      case 'card':
        return <Wallet className={ic} strokeWidth={1.5} />
      case 'mixed':
        return <CreditCard className={ic} strokeWidth={1.5} />
      default:
        return <CreditCard className={ic} strokeWidth={1.5} />
    }
  }

  const getPaymentMethodBadgeClass = () =>
    'border-zinc-200/90 bg-zinc-50/90 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300'

  const loadCredit = useCallback(async () => {
    try {
      setIsLoading(true)
      const c = await CreditsService.getCreditById(creditId)
      if (!c || c.clientId !== clientId) {
        setNotFound(true)
        setCredit(null)
        return
      }
      setCredit(c)
      setNotFound(false)
      const history = await CreditsService.getPaymentHistory(creditId).catch(() => [])
      setPaymentHistory(history)
    } catch {
      setNotFound(true)
      setCredit(null)
    } finally {
      setIsLoading(false)
    }
  }, [creditId, clientId])

  useEffect(() => {
    if (creditId && clientId) loadCredit()
  }, [creditId, clientId, loadCredit])

  const handleAddPayment = async (paymentData: Partial<PaymentRecord>) => {
    if (!credit) return
    try {
      const paymentRecord = await CreditsService.createPaymentRecord({
        creditId: credit.id,
        amount: paymentData.amount!,
        paymentDate: paymentData.paymentDate!,
        paymentMethod: paymentData.paymentMethod!,
        cashAmount: paymentData.cashAmount,
        transferAmount: paymentData.transferAmount,
        description: paymentData.description,
        userId: paymentData.userId,
        userName: paymentData.userName
      })

      const paymentAmount = paymentData.amount!
      const newPaidAmount = credit.paidAmount + paymentAmount
      const newPendingAmount = credit.pendingAmount - paymentAmount
      const newStatus = newPendingAmount <= 0 ? 'completed' : 'partial'

      await CreditsService.updateCredit(credit.id, {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        status: newStatus,
        lastPaymentAmount: paymentAmount,
        lastPaymentDate: paymentData.paymentDate!,
        lastPaymentUser: paymentRecord.userId ?? ''
      })

      setIsPaymentModalOpen(false)
      await loadCredit()
    } catch {
      alert('Error al agregar el pago. Por favor intenta de nuevo.')
    }
  }

  const creditDisplayStatus = credit ? getEffectiveCreditStatus(credit) : 'pending'

  return (
    <RoleProtectedRoute module="payments" requiredAction="view">
      <div className="min-h-screen space-y-6 bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 py-4 pb-24 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 md:py-6 xl:pb-8">
        {isLoading && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Volver al cliente"
              aria-label="Volver al cliente"
              onClick={() => router.push(`/payments/${clientId}`)}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        )}

        {isLoading ? (
          <Card className={cardShell}>
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando crédito…</p>
              </div>
            </CardContent>
          </Card>
        ) : notFound || !credit ? (
          <Card className={cardShell}>
            <CardContent className="p-12 text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">No se encontró este crédito.</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push(`/payments/${clientId}`)}>
                Volver al cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className={cardShell}>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-6 md:gap-8">
                      <div className="flex min-w-0 max-w-full items-center gap-2.5 sm:gap-3">
                        <UserAvatar
                          name={credit.clientName}
                          seed={clientId}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            Cliente
                          </div>
                          <p
                            className="truncate text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-lg"
                            title={credit.clientName}
                          >
                            {credit.clientName}
                          </p>
                        </div>
                      </div>
                      <span
                        className="hidden h-9 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700 sm:block"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          ID crédito
                        </div>
                        <h1 className="font-mono text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                          #{getCreditDescription(credit)}
                        </h1>
                      </div>
                      <span
                        className="hidden h-9 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700 sm:block"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          Factura
                        </div>
                        <p className="font-mono text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:text-base">
                          {credit.invoiceNumber}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                      <div>
                        <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          Total
                        </div>
                        <div className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatCurrency(credit.totalAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          Pagado
                        </div>
                        <div className="text-sm font-semibold tabular-nums text-zinc-600 dark:text-zinc-400">
                          {formatCurrency(credit.paidAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          Pendiente
                        </div>
                        <div
                          className={cn(
                            'text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100',
                            credit.pendingAmount === 0 && 'text-zinc-500 dark:text-zinc-500'
                          )}
                        >
                          {formatCurrency(credit.pendingAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                          Estado
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'flex w-fit items-center gap-1 border px-2 py-0.5 text-[11px] font-normal',
                            creditStatusBadgeClass(creditDisplayStatus, credit)
                          )}
                        >
                          {getStatusIcon(creditDisplayStatus, credit)}
                          {creditStatusLabel(creditDisplayStatus, credit)}
                        </Badge>
                      </div>
                    </div>

                    {credit.dueDate && (
                      <div className="mt-4 border-t border-zinc-200/90 pt-4 dark:border-zinc-800">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={1.5} />
                          <span className="text-zinc-500">Vencimiento:</span>
                          <span className={getDueDateClass(credit.dueDate)}>{formatDate(credit.dueDate)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      title="Volver al cliente"
                      aria-label="Volver al cliente"
                      onClick={() => router.push(`/payments/${clientId}`)}
                    >
                      <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                    {credit.pendingAmount > 0 &&
                      !isCreditCancelled(credit) &&
                      credit.status !== 'cancelled' && (
                        <Button
                          type="button"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          title="Abonar"
                          aria-label="Abonar"
                          onClick={() => setIsPaymentModalOpen(true)}
                        >
                          <DollarSign className="h-4 w-4" strokeWidth={1.5} />
                        </Button>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Fecha de creación
                    </div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {formatDateTime(credit.createdAt)}
                    </div>
                  </div>
                  {credit.createdByName && (
                    <div>
                      <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Registrado por
                      </div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {credit.createdByName}
                      </div>
                    </div>
                  )}
                  {credit.lastPaymentDate && (
                    <div>
                      <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Último abono
                      </div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {formatDateTime(credit.lastPaymentDate)}
                      </div>
                    </div>
                  )}
                  {credit.lastPaymentAmount != null && credit.lastPaymentAmount > 0 && (
                    <div>
                      <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                        Monto último abono
                      </div>
                      <div className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
                        {formatCurrency(credit.lastPaymentAmount)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <div className="mb-3">
                    <h2 className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.5} />
                        Historial de abonos ({paymentHistory.length})
                      </span>
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Abonos registrados para{' '}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{credit.clientName}</span>
                      {' · '}
                      crédito #{getCreditDescription(credit)}
                    </p>
                  </div>

                  {paymentHistory.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-8 text-center dark:border-zinc-700 dark:bg-zinc-950/30">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No hay abonos registrados para {credit.clientName}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {paymentHistory.map(payment => (
                        <div
                          key={payment.id}
                          className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/30"
                        >
                          <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-4">
                            <div className="flex items-center gap-2">
                              <DollarSign
                                className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                                strokeWidth={1.5}
                              />
                              <div>
                                <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                  Monto
                                </div>
                                <div className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                                  {formatCurrency(payment.amount)}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                Método
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  getPaymentMethodBadgeClass(),
                                  'flex w-fit items-center gap-1 border px-2 py-0.5 text-[11px] font-normal'
                                )}
                              >
                                {getPaymentMethodIcon(payment.paymentMethod)}
                                {payment.paymentMethod === 'cash'
                                  ? 'Efectivo'
                                  : payment.paymentMethod === 'transfer'
                                    ? 'Transferencia (Nequi · Bancolombia)'
                                    : payment.paymentMethod === 'card'
                                      ? 'Tarjeta'
                                      : payment.paymentMethod === 'mixed'
                                        ? 'Mixto'
                                        : payment.paymentMethod}
                              </Badge>
                            </div>
                            <div>
                              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                Registrado por
                              </div>
                              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {payment.userName}
                              </div>
                            </div>
                            <div>
                              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                Fecha
                              </div>
                              <div className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                                {formatDateTime(payment.paymentDate)}
                              </div>
                            </div>
                          </div>
                          {payment.description && (
                            <div className="mt-2 border-t border-zinc-200/90 pt-2 dark:border-zinc-800">
                              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                Descripción
                              </div>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300">{payment.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <PaymentModal
              isOpen={isPaymentModalOpen}
              onClose={() => setIsPaymentModalOpen(false)}
              onAddPayment={handleAddPayment}
              credit={credit}
            />
          </>
        )}
      </div>
    </RoleProtectedRoute>
  )
}

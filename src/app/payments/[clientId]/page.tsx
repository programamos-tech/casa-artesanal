'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Eye,
  HandCoins,
  ListChecks,
  Star,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { StatusDot } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS } from '@/components/dashboard/report-bar-chart'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Credit, PaymentRecord } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { PaymentModal } from '@/components/credits/payment-modal'
import {
  BulkPaymentModal,
  type BulkPaymentSubmitPayload,
} from '@/components/credits/bulk-payment-modal'
import {
  allocationsSingleMethod,
  splitMixedByPending,
  type BulkCreditAllocation,
} from '@/lib/credit-bulk-payment'
import { cn } from '@/lib/utils'
import { useCashOperationGate } from '@/components/caja/cash-operation-gate-provider'
import { isCashOperationBlockedError } from '@/lib/cash-operation-gate'
import {
  creditStatusLabel,
  creditStatusTone,
  getEffectiveCreditStatus,
  isCreditCancelled,
  parseCreditDueDateLocal,
} from '@/lib/credit-status-ui'

const detailActionClass =
  'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium leading-none transition-colors disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0'

const detailGhostClass = cn(
  detailActionClass,
  'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white'
)

const detailPrimaryClass = cn(
  detailActionClass,
  'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
)

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-40 dark:text-white/40 dark:hover:text-white'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'
const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

function isCreditPayable(credit: Credit): boolean {
  return (
    credit.pendingAmount > 0 &&
    !isCreditCancelled(credit) &&
    credit.status !== 'cancelled'
  )
}

export default function ClientCreditsPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string
  const { ensureCashReady } = useCashOperationGate()
  
  const [credits, setCredits] = useState<Credit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null)
  const [clientName, setClientName] = useState('')
  const [selectedCreditIds, setSelectedCreditIds] = useState<Set<string>>(() => new Set())
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  /** Checkboxes de fila solo visibles tras "Seleccionar créditos" */
  const [creditSelectionMode, setCreditSelectionMode] = useState(false)

  useEffect(() => {
    if (clientId) {
      loadCredits()
    }
  }, [clientId])

  const loadCredits = async () => {
    try {
      setIsLoading(true)
      const creditsData = await CreditsService.getCreditsByClientId(clientId)
      setCredits(creditsData)
      
      if (creditsData.length > 0) {
        setClientName(creditsData[0].clientName)
      }

      // NO cargar historial y ventas aquí - se cargarán de forma lazy cuando se expanda cada crédito
      // Esto mejora significativamente el rendimiento inicial
    } catch (error) {
      // Error silencioso en producción
      setCredits([])
    } finally {
      setIsLoading(false)
    }
  }

  const payableCredits = useMemo(() => credits.filter(isCreditPayable), [credits])

  const selectedCredits = useMemo(
    () => credits.filter((c) => selectedCreditIds.has(c.id)),
    [credits, selectedCreditIds]
  )

  const totalSelectedPending = useMemo(
    () => selectedCredits.reduce((s, c) => s + c.pendingAmount, 0),
    [selectedCredits]
  )

  useEffect(() => {
    if (bulkModalOpen && selectedCredits.length === 0) {
      setBulkModalOpen(false)
    }
  }, [bulkModalOpen, selectedCredits.length])

  useEffect(() => {
    if (payableCredits.length === 0 && creditSelectionMode) {
      setCreditSelectionMode(false)
      setSelectedCreditIds(new Set())
    }
  }, [payableCredits.length, creditSelectionMode])

  const toggleCreditSelectionMode = useCallback(() => {
    setCreditSelectionMode((prev) => {
      if (prev) setSelectedCreditIds(new Set())
      return !prev
    })
  }, [])

  useEffect(() => {
    setSelectedCreditIds((prev) => {
      const next = new Set<string>()
      for (const id of prev) {
        const c = credits.find((x) => x.id === id)
        if (c && isCreditPayable(c)) next.add(id)
      }
      if (next.size === prev.size) {
        let same = true
        for (const id of prev) {
          if (!next.has(id)) {
            same = false
            break
          }
        }
        if (same) return prev
      }
      return next
    })
  }, [credits])

  const toggleCreditSelected = useCallback((id: string) => {
    setSelectedCreditIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAllPayable = useCallback(() => {
    setSelectedCreditIds((prev) => {
      const allIds = payableCredits.map((c) => c.id)
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.has(id))
      if (allSelected) return new Set()
      return new Set(allIds)
    })
  }, [payableCredits])

  const goToCreditDetail = (creditId: string) => {
    router.push(`/payments/${clientId}/credit/${creditId}`)
  }

  const handlePayment = async (credit: Credit) => {
    if (!(await ensureCashReady('payment'))) return
    setSelectedCredit(credit)
    setIsPaymentModalOpen(true)
  }

  const handleAddPayment = async (paymentData: Partial<PaymentRecord>) => {
    if (!selectedCredit) return

    try {
      const paymentRecord = await CreditsService.createPaymentRecord({
        creditId: selectedCredit.id,
        amount: paymentData.amount!,
        paymentDate: paymentData.paymentDate!,
        paymentMethod: paymentData.paymentMethod!,
        cashAmount: paymentData.cashAmount,
        transferAmount: paymentData.transferAmount,
        digitalTransferMethod: paymentData.digitalTransferMethod,
        description: paymentData.description,
        imageUrl: paymentData.imageUrl,
        userId: paymentData.userId,
        userName: paymentData.userName
      })

      const paymentAmount = paymentData.amount!
      const newPaidAmount = selectedCredit.paidAmount + paymentAmount
      const newPendingAmount = selectedCredit.pendingAmount - paymentAmount
      const newStatus = newPendingAmount <= 0 ? 'completed' : 'partial'

      await CreditsService.updateCredit(selectedCredit.id, {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        status: newStatus,
        lastPaymentAmount: paymentAmount,
        lastPaymentDate: paymentData.paymentDate!,
        lastPaymentUser: paymentRecord.userId!
      })

      setIsPaymentModalOpen(false)
      setSelectedCredit(null)
      await loadCredits()
    } catch (error) {
      if (isCashOperationBlockedError(error)) {
        await ensureCashReady('payment')
        return
      }
      alert('Error al agregar el pago. Por favor intenta de nuevo.')
    }
  }

  const handleBulkPaymentSubmit = async (payload: BulkPaymentSubmitPayload) => {
    if (selectedCredits.length === 0) return

    setBulkSubmitting(true)
    try {
      let allocations: BulkCreditAllocation[]
      if (payload.paymentMethod === 'mixed') {
        allocations = splitMixedByPending(
          selectedCredits,
          payload.cashAmount,
          payload.transferAmount
        )
      } else if (payload.paymentMethod === 'cash') {
        allocations = allocationsSingleMethod(selectedCredits, 'cash')
      } else if (payload.paymentMethod === 'transfer') {
        allocations = allocationsSingleMethod(selectedCredits, 'transfer')
      } else if (payload.paymentMethod === 'nequi') {
        allocations = allocationsSingleMethod(selectedCredits, 'nequi')
      } else if (payload.paymentMethod === 'bancolombia') {
        allocations = allocationsSingleMethod(selectedCredits, 'bancolombia')
      } else {
        allocations = allocationsSingleMethod(selectedCredits, 'card')
      }

      const desc = payload.description?.trim() || undefined

      for (const alloc of allocations) {
        const method = alloc.recordMethod

        await CreditsService.createPaymentRecord({
          creditId: alloc.creditId,
          amount: alloc.amount,
          paymentDate: payload.paymentDate,
          paymentMethod: method,
          cashAmount: method === 'mixed' ? alloc.cashAmount : undefined,
          transferAmount: method === 'mixed' ? alloc.transferAmount : undefined,
          digitalTransferMethod:
            method === 'mixed' ? payload.digitalTransferMethod : undefined,
          description: desc,
          imageUrl: payload.imageUrl,
          userId: payload.userId ?? '',
          userName: payload.userName ?? 'Usuario Actual',
        })
      }

      setBulkModalOpen(false)
      setSelectedCreditIds(new Set())
      setCreditSelectionMode(false)
      await loadCredits()
    } catch (error) {
      if (isCashOperationBlockedError(error)) {
        await ensureCashReady('payment')
        return
      }
      alert(
        'No se pudieron registrar todos los pagos. Revisa el estado de los créditos y vuelve a intentar; algunos abonos podrían haberse aplicado.'
      )
    } finally {
      setBulkSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) =>
    (parseCreditDueDateLocal(dateString) ?? new Date(dateString)).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

  const getDueDateClass = (dueDate: string) => {
    const due = parseCreditDueDateLocal(dueDate)
    if (!due) return 'text-zinc-500 dark:text-zinc-400'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
    if (diffDays < 0) return 'text-rose-600 dark:text-rose-400'
    if (diffDays <= 7) return 'text-amber-600 dark:text-amber-400'
    return 'text-zinc-500 dark:text-zinc-400'
  }

  const getCreditDescription = (credit: Credit): string => {
    // Generar ID del crédito con las primeras 2 letras del cliente + últimos 6 caracteres del UUID
    const clientInitials = credit.clientName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
      .padEnd(2, 'X') // Si el nombre tiene menos de 2 palabras, rellenar con X
    
    const creditSuffix = credit.id.substring(credit.id.length - 6).toLowerCase()
    return `${clientInitials}${creditSuffix}`
  }

  const totalDebt = credits.reduce((sum, credit) => sum + credit.pendingAmount, 0)
  const totalPaid = credits.reduce((sum, credit) => sum + credit.paidAmount, 0)
  const totalAmount = credits.reduce((sum, credit) => sum + credit.totalAmount, 0)

  // Calcular score del cliente (1-5 estrellas)
  const calculateClientScore = (): { stars: number; label: string; color: string; description: string } => {
    if (credits.length === 0) {
      return { stars: 0, label: 'Sin historial', color: 'gray', description: 'No hay créditos registrados' }
    }

    // Si todos los créditos están pagados y no hay deuda, es excelente automáticamente
    if (totalDebt === 0 && credits.every(c => c.status === 'completed' || c.pendingAmount === 0)) {
      return { 
        stars: 5, 
        label: 'Excelente', 
        color: 'green', 
        description: 'Cliente perfecto, todos los créditos pagados completamente' 
      }
    }

    // Parámetros para el score:
    // 1. Porcentaje de créditos completados (50% - más peso)
    const completedCredits = credits.filter(c => c.status === 'completed' || c.pendingAmount === 0).length
    const completionRate = (completedCredits / credits.length) * 100

    // 2. Relación deuda actual vs total histórico (30% - más peso)
    const totalHistorical = credits.reduce((sum, c) => sum + c.totalAmount, 0)
    const debtRatio = totalHistorical > 0 ? ((totalHistorical - totalDebt) / totalHistorical) * 100 : 100

    // 3. Porcentaje de pagos a tiempo - créditos completados antes o en fecha de vencimiento (15%)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const onTimeCredits = credits.filter(c => {
      if (!c.dueDate || c.status !== 'completed') return false
      const dueDate = new Date(c.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      // Si está completado y la fecha de vencimiento es hoy o futura, o si se pagó antes del vencimiento
      if (c.lastPaymentDate) {
        const lastPayment = new Date(c.lastPaymentDate)
        lastPayment.setHours(0, 0, 0, 0)
        return lastPayment <= dueDate
      }
      return dueDate >= today
    }).length
    const creditsWithDueDate = credits.filter(c => c.dueDate && c.status === 'completed').length
    const onTimeRate = creditsWithDueDate > 0 
      ? (onTimeCredits / creditsWithDueDate) * 100 
      : completionRate // Si no hay fechas, usar el rate de completados

    // 4. Velocidad de pago - créditos pagados en menos de 60 días (5% - menos peso)
    const quickPayments = credits.filter(c => {
      if (!c.lastPaymentDate || !c.createdAt || c.status !== 'completed') return false
      const created = new Date(c.createdAt)
      const lastPayment = new Date(c.lastPaymentDate)
      const daysDiff = (lastPayment.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff <= 60 // Más generoso: 60 días
    }).length
    const quickPaymentRate = credits.filter(c => c.status === 'completed').length > 0 
      ? (quickPayments / credits.filter(c => c.status === 'completed').length) * 100 
      : 0

    // Calcular score ponderado (0-100)
    const score = Math.round(
      (completionRate * 0.5) +
      (debtRatio * 0.3) +
      (onTimeRate * 0.15) +
      (quickPaymentRate * 0.05)
    )

    // Convertir a estrellas (1-5) con umbrales más justos
    let stars: number
    let label: string
    let color: string
    let description: string

    if (score >= 95 || (completionRate === 100 && totalDebt === 0)) {
      stars = 5
      label = 'Excelente'
      color = 'green'
      description = 'Cliente muy confiable, paga siempre a tiempo'
    } else if (score >= 80 || (completionRate >= 80 && totalDebt === 0)) {
      stars = 4
      label = 'Bueno'
      color = 'blue'
      description = 'Cliente confiable, buen historial de pagos'
    } else if (score >= 60 || (completionRate >= 60 && debtRatio >= 70)) {
      stars = 3
      label = 'Regular'
      color = 'yellow'
      description = 'Cliente con historial mixto, requiere seguimiento'
    } else if (score >= 40) {
      stars = 2
      label = 'Riesgoso'
      color = 'orange'
      description = 'Cliente con retrasos frecuentes, cuidado'
    } else {
      stars = 1
      label = 'Alto Riesgo'
      color = 'red'
      description = 'Cliente con mal historial, requiere atención'
    }

    return { stars, label, color, description }
  }

  const clientScore = calculateClientScore()

  /** Evita abono individual mientras se elige pago masivo (misma pantalla). */
  const blockIndividualAbono = creditSelectionMode || bulkModalOpen

  const openCredits = credits.filter(isCreditPayable).length
  const tableColSpan = creditSelectionMode ? 9 : 8

  const renderStatus = (credit: Credit) => {
    const status = getEffectiveCreditStatus(credit)
    return (
      <span className="inline-flex items-center gap-1.5">
        <StatusDot tone={creditStatusTone(status, credit)} />
        {creditStatusLabel(status, credit)}
      </span>
    )
  }

  const renderDue = (credit: Credit) => {
    if (!credit.dueDate || getEffectiveCreditStatus(credit) === 'completed') {
      return <span className="text-zinc-400 dark:text-zinc-500">—</span>
    }
    return <span className={cn('tabular-nums', getDueDateClass(credit.dueDate))}>{formatDate(credit.dueDate)}</span>
  }

  const renderPending = (credit: Credit) => (
    <span
      className={cn('font-medium tabular-nums', credit.pendingAmount <= 0 && 'text-zinc-400 dark:text-zinc-500')}
      style={credit.pendingAmount > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
    >
      {formatCurrency(Math.max(0, credit.pendingAmount))}
    </span>
  )

  return (
    <RoleProtectedRoute module="payments" requiredAction="view">
      <div className="py-4 max-xl:pb-1 md:py-6">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">
              {clientName || 'Cliente'}
            </h1>
            <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">Créditos del cliente</p>
            {credits.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-700 dark:text-white/80">
                <span className="inline-flex items-center gap-1.5" title={clientScore.description}>
                  <span className="inline-flex items-center gap-0.5" aria-hidden>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={cn(
                          'h-3 w-3',
                          index < clientScore.stars
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-zinc-200 text-zinc-200 dark:fill-white/10 dark:text-white/10'
                        )}
                      />
                    ))}
                  </span>
                  {clientScore.label}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot tone={openCredits > 0 ? 'warning' : 'success'} />
                  {openCredits > 0
                    ? `${openCredits} ${openCredits === 1 ? 'crédito abierto' : 'créditos abiertos'}`
                    : 'Al día'}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
            <button type="button" onClick={() => router.push('/payments')} className={detailGhostClass}>
              <ArrowLeft strokeWidth={1.75} />
              Volver
            </button>
            <Link href={`/clients/${clientId}`} className={detailGhostClass}>
              <UserRound strokeWidth={1.75} />
              Ficha
            </Link>
            {!isLoading && payableCredits.length > 1 && (
              <button
                type="button"
                onClick={toggleCreditSelectionMode}
                className={creditSelectionMode ? detailGhostClass : detailPrimaryClass}
              >
                {creditSelectionMode ? (
                  <>
                    <X strokeWidth={1.75} />
                    Cancelar selección
                  </>
                ) : (
                  <>
                    <ListChecks strokeWidth={1.75} />
                    Pagar varios
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Total créditos</p>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
              {isLoading ? '…' : formatCurrency(totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Pagado</p>
            <p
              className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
              style={!isLoading && totalPaid > 0 ? { color: REPORT_CHART_COLORS.tertiary } : undefined}
            >
              {isLoading ? '…' : formatCurrency(totalPaid)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Pendiente</p>
            <p
              className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
              style={!isLoading && totalDebt > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
            >
              {isLoading ? '…' : formatCurrency(totalDebt)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Créditos</p>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
              {isLoading ? '…' : credits.length}
            </p>
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">Créditos y facturas</h2>
            {creditSelectionMode ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[13px] text-zinc-500 dark:text-white/50">
                  {selectedCredits.length > 0 ? (
                    <>
                      {selectedCredits.length} {selectedCredits.length === 1 ? 'seleccionado' : 'seleccionados'} ·{' '}
                      <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">
                        {formatCurrency(totalSelectedPending)}
                      </span>
                    </>
                  ) : (
                    'Marca los créditos que vas a pagar'
                  )}
                </span>
                <button
                  type="button"
                  disabled={selectedCredits.length === 0}
                  className={detailPrimaryClass}
                  onClick={() => {
                    void (async () => {
                      if (!(await ensureCashReady('payment'))) return
                      setBulkModalOpen(true)
                    })()
                  }}
                >
                  <Wallet strokeWidth={1.75} />
                  Pagar selección
                </button>
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-[13px] text-zinc-500 dark:text-white/50">Cargando créditos…</p>
          ) : credits.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-zinc-500 dark:text-white/50">
              No hay créditos registrados para este cliente.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08] lg:block">
                <table className="w-full min-w-[840px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-white/[0.03]">
                      {creditSelectionMode && (
                        <th className="w-10 px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={payableCredits.length > 0 && payableCredits.every(c => selectedCreditIds.has(c.id))}
                            onChange={toggleSelectAllPayable}
                            className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900 dark:accent-white"
                            aria-label="Seleccionar todos los créditos con saldo"
                          />
                        </th>
                      )}
                      <th className={thClass}>Crédito</th>
                      <th className={thClass}>Factura</th>
                      <th className={cn(thClass, 'text-right')}>Total</th>
                      <th className={cn(thClass, 'text-right')}>Pagado</th>
                      <th className={cn(thClass, 'text-right')}>Pendiente</th>
                      <th className={thClass}>Estado</th>
                      <th className={thClass}>Vence</th>
                      <th className="w-[5.5rem] px-2 py-2.5">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.map(credit => {
                      const payable = isCreditPayable(credit)
                      return (
                        <tr
                          key={credit.id}
                          className="cursor-pointer border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-white/[0.05] dark:hover:bg-white/[0.03]"
                          onClick={() =>
                            creditSelectionMode && payable ? toggleCreditSelected(credit.id) : goToCreditDetail(credit.id)
                          }
                        >
                          {creditSelectionMode && (
                            <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                              {payable ? (
                                <input
                                  type="checkbox"
                                  checked={selectedCreditIds.has(credit.id)}
                                  onChange={() => toggleCreditSelected(credit.id)}
                                  className="h-3.5 w-3.5 rounded border-zinc-300 accent-zinc-900 dark:accent-white"
                                  aria-label={`Seleccionar crédito ${credit.invoiceNumber}`}
                                />
                              ) : null}
                            </td>
                          )}
                          <td className={cn(tdClass, 'whitespace-nowrap font-mono text-xs')}>#{getCreditDescription(credit)}</td>
                          <td className={cn(tdClass, 'whitespace-nowrap font-mono text-xs text-zinc-500 dark:text-zinc-400')}>
                            {credit.invoiceNumber}
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>
                            {formatCurrency(credit.totalAmount)}
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums text-zinc-500 dark:text-zinc-400')}>
                            {formatCurrency(credit.paidAmount)}
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap text-right')}>{renderPending(credit)}</td>
                          <td className={cn(tdClass, 'whitespace-nowrap')}>{renderStatus(credit)}</td>
                          <td className={cn(tdClass, 'whitespace-nowrap')}>{renderDue(credit)}</td>
                          <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-0.5">
                              {payable && (
                                <button
                                  type="button"
                                  className={rowIconBtnClass}
                                  disabled={blockIndividualAbono}
                                  title={blockIndividualAbono ? 'Cancela la selección para abonar uno solo' : 'Abonar'}
                                  aria-label="Abonar"
                                  onClick={() => handlePayment(credit)}
                                >
                                  <HandCoins className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              )}
                              <button
                                type="button"
                                className={rowIconBtnClass}
                                title="Ver detalle"
                                aria-label="Ver detalle"
                                onClick={() => goToCreditDetail(credit.id)}
                              >
                                <Eye className="h-4 w-4" strokeWidth={1.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-white/[0.03]">
                      <td className={cn(tdClass, 'text-xs font-semibold')} colSpan={creditSelectionMode ? 3 : 2}>
                        Total
                      </td>
                      <td className={cn(tdClass, 'text-right font-semibold tabular-nums')}>{formatCurrency(totalAmount)}</td>
                      <td className={cn(tdClass, 'text-right font-semibold tabular-nums')}>{formatCurrency(totalPaid)}</td>
                      <td className={cn(tdClass, 'text-right font-semibold tabular-nums')}>{formatCurrency(totalDebt)}</td>
                      <td colSpan={tableColSpan - (creditSelectionMode ? 6 : 5)} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-white/[0.07] dark:border-white/[0.08] lg:hidden">
                {credits.map(credit => {
                  const payable = isCreditPayable(credit)
                  return (
                    <li key={credit.id} className="flex items-center gap-3 px-4 py-3">
                      {creditSelectionMode && payable ? (
                        <input
                          type="checkbox"
                          checked={selectedCreditIds.has(credit.id)}
                          onChange={() => toggleCreditSelected(credit.id)}
                          className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-900 dark:accent-white"
                          aria-label={`Seleccionar crédito ${credit.invoiceNumber}`}
                        />
                      ) : null}
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => goToCreditDetail(credit.id)}>
                        <p className="font-mono text-xs text-zinc-500 dark:text-white/50">
                          #{getCreditDescription(credit)} · {credit.invoiceNumber}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-zinc-700 dark:text-white/80">
                          {renderPending(credit)}
                          <span className="text-zinc-300 dark:text-white/20">·</span>
                          {renderStatus(credit)}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-white/45">
                          Total {formatCurrency(credit.totalAmount)}
                          {credit.dueDate && getEffectiveCreditStatus(credit) !== 'completed' ? (
                            <>
                              {' · Vence '}
                              {renderDue(credit)}
                            </>
                          ) : null}
                        </p>
                      </button>
                      {payable && !creditSelectionMode ? (
                        <button
                          type="button"
                          className={rowIconBtnClass}
                          disabled={blockIndividualAbono}
                          aria-label="Abonar"
                          onClick={() => handlePayment(credit)}
                        >
                          <HandCoins className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setSelectedCredit(null)
          }}
          onAddPayment={handleAddPayment}
          credit={selectedCredit}
        />

        <BulkPaymentModal
          isOpen={bulkModalOpen}
          onClose={() => !bulkSubmitting && setBulkModalOpen(false)}
          onSubmit={handleBulkPaymentSubmit}
          clientName={clientName || 'Cliente'}
          creditCount={selectedCredits.length}
          totalPending={totalSelectedPending}
          submitting={bulkSubmitting}
        />
      </div>
    </RoleProtectedRoute>
  )
}

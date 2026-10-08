'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, CalendarClock, HandCoins, Receipt, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { StatusDot } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS } from '@/components/dashboard/report-bar-chart'
import { PaymentMethodLabel } from '@/components/sales/payment-method-label'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Credit, PaymentRecord } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { PaymentModal } from '@/components/credits/payment-modal'
import { PaymentReceiptThumb } from '@/components/credits/payment-receipt-field'
import { cn } from '@/lib/utils'
import { isCashOperationBlockedError } from '@/lib/cash-operation-gate'
import {
  creditStatusLabel,
  creditStatusTone,
  getEffectiveCreditStatus,
  isCreditCancelled,
  parseCreditDueDateLocal,
} from '@/lib/credit-status-ui'
import { useCashOperationGate } from '@/components/caja/cash-operation-gate-provider'

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

const metaIconClass = 'h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/40'

const rowDangerIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-rose-600 disabled:opacity-40 dark:text-white/40 dark:hover:text-rose-400'

const cancelledTagClass =
  'casa-artesanal-preserve-surface rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'
const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

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
  const { ensureCashReady } = useCashOperationGate()
  const { user } = useAuth()
  const { canCancel, canDelete } = usePermissions()

  const [credit, setCredit] = useState<Credit | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PaymentRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isDeletingRef = useRef(false)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)

  const formatDate = (dateString: string) =>
    (parseCreditDueDateLocal(dateString) ?? new Date(dateString)).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
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
    const due = parseCreditDueDateLocal(dueDate)
    if (!due) return 'tabular-nums'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000)
    if (diffDays < 0) return 'tabular-nums text-rose-600 dark:text-rose-400'
    if (diffDays <= 7) return 'tabular-nums text-amber-600 dark:text-amber-400'
    return 'tabular-nums'
  }

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

  const handleAddPayment = async (paymentData: Partial<PaymentRecord>): Promise<boolean> => {
    if (!credit) return false
    let recordCreated = false
    try {
      const paymentRecord = await CreditsService.createPaymentRecord({
        creditId: credit.id,
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
      recordCreated = true

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
      return true
    } catch (error) {
      if (recordCreated) {
        setIsPaymentModalOpen(false)
        await loadCredit()
        return true
      }
      if (isCashOperationBlockedError(error)) {
        await ensureCashReady('payment')
        return false
      }
      alert('Error al agregar el pago. Por favor intenta de nuevo.')
      return false
    }
  }

  const requestDeletePayment = (payment: PaymentRecord) => {
    void (async () => {
      if (!(await ensureCashReady('payment'))) return
      setDeleteTarget(payment)
    })()
  }

  const handleDeletePayment = async () => {
    if (!credit || !deleteTarget || !user?.id || isDeletingRef.current) return
    isDeletingRef.current = true
    setIsDeleting(true)
    try {
      const { refundedAmount } = await CreditsService.cancelPaymentRecord(
        credit.id,
        deleteTarget.id,
        user.id,
        user.name || 'Usuario'
      )
      toast.success(`Abono de ${formatCurrency(refundedAmount)} eliminado`)
      setDeleteTarget(null)
      await loadCredit()
    } catch (error) {
      if (isCashOperationBlockedError(error)) {
        setDeleteTarget(null)
        await ensureCashReady('payment')
        return
      }
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el abono')
    } finally {
      isDeletingRef.current = false
      setIsDeleting(false)
    }
  }

  const creditDisplayStatus = credit ? getEffectiveCreditStatus(credit) : 'pending'
  const activePayments = paymentHistory.filter(payment => payment.status !== 'cancelled')
  const canDeletePayments =
    (canCancel('payments') || canDelete('payments')) && Boolean(credit) && !isCreditCancelled(credit!)
  const isPaymentCancelled = (payment: PaymentRecord) => payment.status === 'cancelled'
  const isMixedPart = (payment: PaymentRecord) => /pago mixto|\(parte /i.test(payment.description ?? '')
  const canPay = Boolean(
    credit && credit.pendingAmount > 0 && !isCreditCancelled(credit) && credit.status !== 'cancelled'
  )
  const paidPercent = credit && credit.totalAmount > 0 ? Math.min(100, (credit.paidAmount / credit.totalAmount) * 100) : 0
  const pendingPercent =
    credit && credit.totalAmount > 0 ? Math.min(100, (Math.max(0, credit.pendingAmount) / credit.totalAmount) * 100) : 0
  const formatPercent = (value: number) =>
    `${value > 0 && value < 1 ? '<1' : value > 99 && value < 100 ? '>99' : Math.round(value)}%`

  const openPaymentModal = () => {
    void (async () => {
      if (!(await ensureCashReady('payment'))) return
      setIsPaymentModalOpen(true)
    })()
  }

  return (
    <RoleProtectedRoute module="payments" requiredAction="view">
      <div className="py-4 max-xl:pb-1 md:py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
            <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando crédito…</p>
          </div>
        ) : notFound || !credit ? (
          <div className="py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 dark:text-white">No se encontró este crédito</p>
            <button type="button" className={cn(detailGhostClass, 'mt-5')} onClick={() => router.push(`/payments/${clientId}`)}>
              <ArrowLeft strokeWidth={1.75} />
              Volver al cliente
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">
                  Crédito <span className="font-mono">#{getCreditDescription(credit)}</span>
                </h1>
                <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">
                  <Link
                    href={`/clients/${clientId}`}
                    className="underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-white"
                  >
                    {credit.clientName}
                  </Link>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-700 dark:text-white/80">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot tone={creditStatusTone(creditDisplayStatus, credit)} />
                    {creditStatusLabel(creditDisplayStatus, credit)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Receipt className={metaIconClass} strokeWidth={1.75} aria-hidden />
                    {credit.saleId ? (
                      <Link href={`/sales/${credit.saleId}`} className="font-mono text-xs underline-offset-2 hover:underline">
                        {credit.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{credit.invoiceNumber}</span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className={metaIconClass} strokeWidth={1.75} aria-hidden />
                    <time dateTime={credit.createdAt}>{formatDate(credit.createdAt)}</time>
                  </span>
                  {credit.dueDate && creditDisplayStatus !== 'completed' ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className={metaIconClass} strokeWidth={1.75} aria-hidden />
                      Vence <span className={getDueDateClass(credit.dueDate)}>{formatDate(credit.dueDate)}</span>
                    </span>
                  ) : null}
                  {credit.createdByName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <User className={metaIconClass} strokeWidth={1.75} aria-hidden />
                      {credit.createdByName}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <button type="button" onClick={() => router.push(`/payments/${clientId}`)} className={detailGhostClass}>
                  <ArrowLeft strokeWidth={1.75} />
                  Volver
                </button>
                {credit.saleId ? (
                  <Link href={`/sales/${credit.saleId}`} className={detailGhostClass}>
                    <Receipt strokeWidth={1.75} />
                    Factura
                  </Link>
                ) : null}
                {canPay ? (
                  <button type="button" onClick={openPaymentModal} className={detailPrimaryClass}>
                    <HandCoins strokeWidth={1.75} />
                    Abonar
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 border-b border-zinc-200 pb-5 dark:border-white/[0.07]">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Total</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
                    {formatCurrency(credit.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Pagado</p>
                  <p
                    className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
                    style={credit.paidAmount > 0 ? { color: REPORT_CHART_COLORS.tertiary } : undefined}
                  >
                    {formatCurrency(credit.paidAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Pendiente</p>
                  <p
                    className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
                    style={credit.pendingAmount > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
                  >
                    {formatCurrency(Math.max(0, credit.pendingAmount))}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Abonos</p>
                  <p
                    className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
                    style={activePayments.length > 0 ? { color: REPORT_CHART_COLORS.abono } : undefined}
                  >
                    {activePayments.length}
                  </p>
                </div>
              </div>
              {credit.totalAmount > 0 && !isCreditCancelled(credit) ? (
                <div className="mt-4">
                  <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                    {paidPercent > 0 ? (
                      <div
                        className="casa-artesanal-preserve-surface h-full"
                        style={{ width: `${paidPercent}%`, backgroundColor: REPORT_CHART_COLORS.tertiary }}
                      />
                    ) : null}
                    {pendingPercent > 0 ? (
                      <div
                        className="casa-artesanal-preserve-surface h-full flex-1"
                        style={{ backgroundColor: REPORT_CHART_COLORS.primary }}
                      />
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] tabular-nums">
                    <span style={{ color: REPORT_CHART_COLORS.tertiary }}>
                      {formatPercent(paidPercent)} pagado · {formatCurrency(credit.paidAmount)}
                    </span>
                    {pendingPercent > 0 ? (
                      <span style={{ color: REPORT_CHART_COLORS.primary }}>
                        {formatPercent(pendingPercent)} pendiente · {formatCurrency(Math.max(0, credit.pendingAmount))}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <section className="mt-8">
              <h2 className="mb-3 text-[13px] font-semibold text-zinc-900 dark:text-white">Historial de abonos</h2>

              {paymentHistory.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-zinc-500 dark:text-white/50">
                  Aún no hay abonos registrados.
                </p>
              ) : (
                <>
                  <div className="hidden overflow-hidden rounded-xl border border-zinc-200 dark:border-white/[0.08] md:block">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-white/[0.03]">
                          <th className={thClass}>Fecha</th>
                          <th className={thClass}>Método</th>
                          <th className={thClass}>Registrado por</th>
                          <th className={thClass}>Nota</th>
                          <th className={cn(thClass, 'text-right')}>Monto</th>
                          <th className="w-14 px-2 py-2.5">
                            <span className="sr-only">Comprobante</span>
                          </th>
                          {canDeletePayments ? (
                            <th className="w-12 px-2 py-2.5">
                              <span className="sr-only">Acciones</span>
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map(payment => (
                          <tr
                            key={payment.id}
                            className={cn(
                              'border-b border-zinc-100 last:border-0 dark:border-white/[0.05]',
                              isPaymentCancelled(payment) && 'opacity-55'
                            )}
                            title={
                              isPaymentCancelled(payment)
                                ? `Anulado${payment.cancelledByName ? ` por ${payment.cancelledByName}` : ''}${payment.cancelledAt ? ` · ${formatDateTime(payment.cancelledAt)}` : ''}`
                                : undefined
                            }
                          >
                            <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                              <span className="inline-flex items-center gap-2">
                                {formatDateTime(payment.paymentDate)}
                                {isPaymentCancelled(payment) ? <span className={cancelledTagClass}>Anulado</span> : null}
                              </span>
                            </td>
                            <td className={cn(tdClass, 'whitespace-nowrap')}>
                              <PaymentMethodLabel method={payment.paymentMethod} />
                            </td>
                            <td className={cn(tdClass, 'whitespace-nowrap text-zinc-500 dark:text-zinc-400')}>
                              {payment.userName || '—'}
                            </td>
                            <td className={cn(tdClass, 'min-w-[16rem] whitespace-pre-wrap break-words text-zinc-500 dark:text-zinc-400')}>
                              {payment.description?.trim() || '—'}
                            </td>
                            <td
                              className={cn(
                                tdClass,
                                'whitespace-nowrap text-right font-medium tabular-nums',
                                isPaymentCancelled(payment) && 'line-through'
                              )}
                              style={{ color: REPORT_CHART_COLORS.abono }}
                            >
                              {formatCurrency(payment.amount)}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {payment.imageUrl ? (
                                <a
                                  href={payment.imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Ver comprobante"
                                  className="ml-auto block h-8 w-8 overflow-hidden rounded-md border border-zinc-200 transition-opacity hover:opacity-80 dark:border-white/[0.12]"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={payment.imageUrl}
                                    alt={`Comprobante ${formatCurrency(payment.amount)}`}
                                    className="h-full w-full object-cover"
                                  />
                                </a>
                              ) : null}
                            </td>
                            {canDeletePayments ? (
                              <td className="px-2 py-1.5 text-right">
                                {!isPaymentCancelled(payment) ? (
                                  <button
                                    type="button"
                                    onClick={() => requestDeletePayment(payment)}
                                    className={cn(rowDangerIconBtnClass, 'ml-auto')}
                                    title="Eliminar abono"
                                    aria-label="Eliminar abono"
                                  >
                                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                  </button>
                                ) : null}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-white/[0.07] dark:border-white/[0.08] md:hidden">
                    {paymentHistory.map(payment => (
                      <li
                        key={payment.id}
                        className={cn('flex items-start justify-between gap-3 px-4 py-3', isPaymentCancelled(payment) && 'opacity-55')}
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-[13px] font-medium tabular-nums">
                            <span
                              className={cn(isPaymentCancelled(payment) && 'line-through')}
                              style={{ color: REPORT_CHART_COLORS.abono }}
                            >
                              {formatCurrency(payment.amount)}
                            </span>
                            {isPaymentCancelled(payment) ? <span className={cancelledTagClass}>Anulado</span> : null}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600 dark:text-white/70">
                            <PaymentMethodLabel method={payment.paymentMethod} className="gap-1.5" />
                            <span className="text-zinc-300 dark:text-white/20">·</span>
                            <span className="tabular-nums">{formatDateTime(payment.paymentDate)}</span>
                          </p>
                          {payment.description?.trim() ? (
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-white/45">{payment.description.trim()}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {payment.imageUrl ? (
                            <PaymentReceiptThumb url={payment.imageUrl} amountLabel={formatCurrency(payment.amount)} />
                          ) : null}
                          {canDeletePayments && !isPaymentCancelled(payment) ? (
                            <button
                              type="button"
                              onClick={() => requestDeletePayment(payment)}
                              className={rowDangerIconBtnClass}
                              title="Eliminar abono"
                              aria-label="Eliminar abono"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <PaymentModal
              isOpen={isPaymentModalOpen}
              onClose={() => setIsPaymentModalOpen(false)}
              onAddPayment={handleAddPayment}
              credit={credit}
            />

            <ConfirmModal
              isOpen={!!deleteTarget}
              onClose={() => (isDeleting ? undefined : setDeleteTarget(null))}
              onConfirm={() => void handleDeletePayment()}
              confirmDisabled={isDeleting}
              title="Eliminar abono"
              message={
                deleteTarget
                  ? `¿Eliminar el abono de ${formatCurrency(deleteTarget.amount)} del ${formatDateTime(deleteTarget.paymentDate)}? El monto vuelve al saldo pendiente y se descuenta de la caja${isMixedPart(deleteTarget) ? '. Se eliminan las dos partes del pago mixto' : ''}.`
                  : ''
              }
              confirmText={isDeleting ? 'Eliminando…' : 'Eliminar'}
            />
          </>
        )}
      </div>
    </RoleProtectedRoute>
  )
}

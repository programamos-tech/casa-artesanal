'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ExternalLink, FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SupplierInvoice, SupplierPaymentRecord } from '@/types'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { isCashOperationBlockedError } from '@/lib/cash-operation-gate'
import { useAuth } from '@/contexts/auth-context'
import { useCashOperationGate } from '@/components/caja/cash-operation-gate-provider'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { REPORT_CHART_COLORS } from '@/components/dashboard/report-bar-chart'
import { PaymentMethodLabel, getPaymentMethodLabel } from '@/components/sales/payment-method-label'
import {
  formatSupplierCurrency as formatCurrency,
  formatSupplierDate as formatDate,
} from '@/components/supplier-invoices/supplier-invoice-status'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'
const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'
const sectionTitleClass = 'mb-3 text-[13px] font-semibold text-zinc-900 dark:text-white'

const rowDangerIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-rose-600 disabled:opacity-40 dark:text-white/40 dark:hover:text-rose-400'

const cancelledTagClass =
  'casa-artesanal-preserve-surface rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'

function isPdfAttachment(ref: string, publicUrl: string): boolean {
  const path = ref.split('?')[0].toLowerCase()
  if (path.endsWith('.pdf')) return true
  return /\.pdf(\?|$)/i.test(publicUrl)
}

interface SupplierInvoiceDetailViewProps {
  invoice: SupplierInvoice
  canEdit: boolean
  canCancelPayments?: boolean
  onPaymentCancelled?: () => void | Promise<void>
}

export function SupplierInvoiceDetailView({
  invoice,
  canEdit,
  canCancelPayments = false,
  onPaymentCancelled,
}: SupplierInvoiceDetailViewProps) {
  const { user } = useAuth()
  const { ensureCashReady } = useCashOperationGate()
  const [payments, setPayments] = useState<SupplierPaymentRecord[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<SupplierPaymentRecord | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const isCancellingRef = useRef(false)

  useEffect(() => {
    if (!invoice?.id) {
      setPayments([])
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingPayments(true)
      try {
        const list = await SupplierInvoicesService.getPaymentHistory(invoice.id)
        if (!cancelled) setPayments(list)
      } catch {
        if (!cancelled) setPayments([])
      } finally {
        if (!cancelled) setLoadingPayments(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [invoice?.id, invoice?.paidAmount, invoice?.updatedAt])

  const isCancelled = invoice.status === 'cancelled'
  const canEditInvoice = canEdit && !isCancelled && invoice.status !== 'paid'
  const pending = Math.max(0, invoice.totalAmount - invoice.paidAmount)
  const paidPercent = invoice.totalAmount > 0 ? Math.min(100, (invoice.paidAmount / invoice.totalAmount) * 100) : 0
  const pendingPercent = invoice.totalAmount > 0 ? Math.min(100, (pending / invoice.totalAmount) * 100) : 0
  const formatPercent = (value: number) =>
    `${value > 0 && value < 1 ? '<1' : value > 99 && value < 100 ? '>99' : Math.round(value)}%`
  const hasSourceSales = payments.some((p) => p.sourceSaleId)
  const activePaymentsCount = payments.filter((p) => p.status !== 'cancelled').length
  const showCancelColumn = canCancelPayments && !isCancelled
  const attachments = invoice.attachmentUrls ?? []

  const requestCancelPayment = (p: SupplierPaymentRecord) => {
    void (async () => {
      if (!(await ensureCashReady('supplier'))) return
      setCancelTarget(p)
    })()
  }

  const handleCancelPayment = async () => {
    if (!cancelTarget || !user?.id || isCancellingRef.current) return
    isCancellingRef.current = true
    setIsCancelling(true)
    try {
      const { refundedAmount } = await SupplierInvoicesService.cancelPayment(
        cancelTarget.id,
        user.id,
        user.name || 'Usuario'
      )
      toast.success(`Abono de ${formatCurrency(refundedAmount)} anulado`)
      setCancelTarget(null)
      await onPaymentCancelled?.()
    } catch (error) {
      if (isCashOperationBlockedError(error)) {
        setCancelTarget(null)
        await ensureCashReady('supplier')
        return
      }
      toast.error(error instanceof Error ? error.message : 'No se pudo anular el abono')
    } finally {
      isCancellingRef.current = false
      setIsCancelling(false)
    }
  }

  const renderSource = (p: SupplierPaymentRecord) => {
    if (!p.sourceSaleId) return <span className="text-zinc-400">—</span>
    return (
      <span className="text-zinc-600 dark:text-zinc-300">
        <Link href={`/sales/${p.sourceSaleId}`} className="font-mono text-xs underline-offset-2 hover:underline">
          {p.sourceSaleInvoiceNumber || p.sourceSaleId.slice(0, 8)}
        </Link>
        {p.sourceChannel ? ` · ${getPaymentMethodLabel(p.sourceChannel)}` : ''}
      </span>
    )
  }

  const renderMixedBreakdown = (p: SupplierPaymentRecord) =>
    p.paymentMethod === 'mixed' && p.cashAmount != null && p.transferAmount != null ? (
      <span className="mt-0.5 block text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        Efectivo {formatCurrency(p.cashAmount)} · Transf. {formatCurrency(p.transferAmount)}
      </span>
    ) : null

  return (
    <>
      <div className="mt-5 border-b border-zinc-200 pb-5 dark:border-white/[0.07]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Total</p>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
              {formatCurrency(invoice.totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Pagado</p>
            <p
              className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
              style={invoice.paidAmount > 0 ? { color: REPORT_CHART_COLORS.tertiary } : undefined}
            >
              {formatCurrency(invoice.paidAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Pendiente</p>
            <p
              className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
              style={!isCancelled && pending > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
            >
              {formatCurrency(isCancelled ? 0 : pending)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Abonos</p>
            <p
              className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
              style={activePaymentsCount > 0 ? { color: REPORT_CHART_COLORS.abono } : undefined}
            >
              {loadingPayments ? '…' : activePaymentsCount}
            </p>
          </div>
        </div>
        {invoice.totalAmount > 0 && !isCancelled ? (
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
                {formatPercent(paidPercent)} pagado · {formatCurrency(invoice.paidAmount)}
              </span>
              {pendingPercent > 0 ? (
                <span style={{ color: REPORT_CHART_COLORS.primary }}>
                  {formatPercent(pendingPercent)} pendiente · {formatCurrency(pending)}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {isCancelled && invoice.cancellationReason ? (
        <section className="mt-8">
          <h2 className={cn(sectionTitleClass, 'mb-1 text-rose-600 dark:text-rose-300')}>Motivo de anulación</h2>
          <p className="whitespace-pre-wrap text-[13px] text-zinc-700 dark:text-white/80">{invoice.cancellationReason}</p>
        </section>
      ) : null}

      {invoice.notes?.trim() ? (
        <section className="mt-8">
          <h2 className={cn(sectionTitleClass, 'mb-1')}>Notas</h2>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700 dark:text-white/80">
            {invoice.notes.trim()}
          </p>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className={sectionTitleClass}>
          Comprobantes
          {attachments.length > 0 ? (
            <span className="ml-1.5 font-normal text-zinc-400 dark:text-white/40">{attachments.length}</span>
          ) : null}
        </h2>
        {attachments.length === 0 ? (
          <p className="text-[13px] text-zinc-500 dark:text-white/50">
            Sin comprobantes.{' '}
            {canEditInvoice ? 'Edita la factura para adjuntar imágenes o PDF.' : 'No hay archivos registrados.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {attachments.map((url, i) => {
              const ref = invoice.attachmentRefs?.[i] ?? ''
              const pdf = isPdfAttachment(ref, url)
              return (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir en pestaña nueva"
                  className="casa-artesanal-preserve-surface group relative block aspect-[3/4] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition-colors hover:border-zinc-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20"
                >
                  {pdf ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-500 dark:text-white/50">
                      <FileText className="h-8 w-8" strokeWidth={1.25} />
                      <span className="text-xs font-medium">PDF {attachments.length > 1 ? i + 1 : ''}</span>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={url}
                      alt={`Comprobante ${i + 1} · ${invoice.invoiceNumber}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-zinc-900/90 dark:text-white/70">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className={sectionTitleClass}>Historial de abonos</h2>
        {loadingPayments ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          </div>
        ) : payments.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-zinc-500 dark:text-white/50">Aún no hay abonos registrados.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08] md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-white/[0.03]">
                    <th className={thClass}>Fecha</th>
                    <th className={thClass}>Método</th>
                    {hasSourceSales ? <th className={thClass}>Origen</th> : null}
                    <th className={thClass}>Registrado por</th>
                    <th className={thClass}>Nota</th>
                    <th className={cn(thClass, 'text-right')}>Monto</th>
                    <th className="w-14 px-2 py-2.5">
                      <span className="sr-only">Comprobante</span>
                    </th>
                    {showCancelColumn ? (
                      <th className="w-10 px-2 py-2.5">
                        <span className="sr-only">Anular</span>
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className={cn(
                        'border-b border-zinc-100 align-top last:border-0 dark:border-white/[0.05]',
                        p.status === 'cancelled' && 'opacity-55'
                      )}
                    >
                      <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                        <span className="inline-flex items-center gap-2">
                          {formatDate(p.paymentDate)}
                          {p.status === 'cancelled' ? <span className={cancelledTagClass}>Anulado</span> : null}
                        </span>
                      </td>
                      <td className={cn(tdClass, 'whitespace-nowrap')}>
                        <PaymentMethodLabel method={p.paymentMethod} />
                        {renderMixedBreakdown(p)}
                      </td>
                      {hasSourceSales ? <td className={cn(tdClass, 'whitespace-nowrap')}>{renderSource(p)}</td> : null}
                      <td className={cn(tdClass, 'whitespace-nowrap text-zinc-500 dark:text-zinc-400')}>{p.userName || '—'}</td>
                      <td className={cn(tdClass, 'min-w-[10rem] whitespace-pre-wrap break-words text-zinc-500 dark:text-zinc-400')}>
                        {p.notes?.trim() || '—'}
                      </td>
                      <td
                        className={cn(
                          tdClass,
                          'whitespace-nowrap text-right font-medium tabular-nums',
                          p.status === 'cancelled' && 'line-through'
                        )}
                        style={{ color: REPORT_CHART_COLORS.abono }}
                      >
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {p.imageUrl ? (
                          <a
                            href={p.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver comprobante"
                            className="ml-auto block h-8 w-8 overflow-hidden rounded-md border border-zinc-200 transition-opacity hover:opacity-80 dark:border-white/[0.12]"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.imageUrl} alt={`Comprobante ${formatCurrency(p.amount)}`} className="h-full w-full object-cover" />
                          </a>
                        ) : null}
                      </td>
                      {showCancelColumn ? (
                        <td className="px-2 py-1.5 text-right">
                          {p.status !== 'cancelled' ? (
                            <button
                              type="button"
                              onClick={() => requestCancelPayment(p)}
                              className={cn(rowDangerIconBtnClass, 'ml-auto')}
                              title="Anular abono"
                              aria-label="Anular abono"
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
              {payments.map((p) => (
                <li
                  key={p.id}
                  className={cn('flex items-start justify-between gap-3 px-4 py-3', p.status === 'cancelled' && 'opacity-55')}
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13px] font-medium tabular-nums">
                      <span
                        className={cn(p.status === 'cancelled' && 'line-through')}
                        style={{ color: REPORT_CHART_COLORS.abono }}
                      >
                        {formatCurrency(p.amount)}
                      </span>
                      {p.status === 'cancelled' ? <span className={cancelledTagClass}>Anulado</span> : null}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600 dark:text-white/70">
                      <PaymentMethodLabel method={p.paymentMethod} className="gap-1.5" />
                      <span className="text-zinc-300 dark:text-white/20">·</span>
                      <span className="tabular-nums">{formatDate(p.paymentDate)}</span>
                      {p.userName ? (
                        <>
                          <span className="text-zinc-300 dark:text-white/20">·</span>
                          <span>{p.userName}</span>
                        </>
                      ) : null}
                    </p>
                    {renderMixedBreakdown(p)}
                    {p.sourceSaleId ? <p className="mt-0.5 text-xs">Origen: {renderSource(p)}</p> : null}
                    {p.notes?.trim() ? (
                      <p className="mt-0.5 whitespace-pre-wrap text-xs text-zinc-500 dark:text-white/45">{p.notes.trim()}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {p.imageUrl ? (
                      <a
                        href={p.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver comprobante"
                        className="block h-10 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-200 dark:border-white/[0.12]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt={`Comprobante ${formatCurrency(p.amount)}`} className="h-full w-full object-cover" />
                      </a>
                    ) : null}
                    {showCancelColumn && p.status !== 'cancelled' ? (
                      <button
                        type="button"
                        onClick={() => requestCancelPayment(p)}
                        className={rowDangerIconBtnClass}
                        title="Anular abono"
                        aria-label="Anular abono"
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

      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => (isCancelling ? undefined : setCancelTarget(null))}
        onConfirm={() => void handleCancelPayment()}
        confirmDisabled={isCancelling}
        title="Anular abono"
        message={
          cancelTarget
            ? `¿Anular el abono de ${formatCurrency(cancelTarget.amount)} del ${formatDate(cancelTarget.paymentDate)}? El monto vuelve al saldo pendiente de la factura${cancelTarget.linkedEgresoId ? ' y se anula el egreso ligado' : ''}.`
            : ''
        }
        confirmText={isCancelling ? 'Anulando…' : 'Anular'}
      />
    </>
  )
}

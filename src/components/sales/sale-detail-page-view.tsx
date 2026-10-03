'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  Ban,
  Calendar,
  CheckCircle2,
  CreditCard,
  Pencil,
  Printer,
  User,
} from 'lucide-react'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { REPORT_CHART_COLORS } from '@/components/dashboard/report-bar-chart'
import { PaymentMethodLabel } from '@/components/sales/payment-method-label'
import { cn } from '@/lib/utils'
import { modalInputClass } from '@/lib/app-modal'
import { Sale, Credit, StoreStockTransfer } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { creditStatusLabel, getEffectiveCreditStatus } from '@/lib/credit-status-ui'

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

const detailDangerClass = cn(
  detailActionClass,
  'border border-zinc-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-white/[0.12] dark:text-rose-300 dark:hover:border-rose-400/40 dark:hover:bg-rose-500/10'
)

const metaIconClass = 'h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/40'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'
const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

const sectionTitleClass = 'text-[13px] font-semibold text-zinc-900 dark:text-white'

function statusTone(status: string): ReportTone {
  if (status === 'completed') return 'success'
  if (status === 'pending' || status === 'partial') return 'warning'
  if (status === 'overdue' || status === 'cancelled') return 'danger'
  if (status === 'draft') return 'info'
  return 'neutral'
}

function saleStatusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'Completada'
    case 'pending':
      return 'Pendiente'
    case 'draft':
      return 'Borrador'
    case 'cancelled':
      return 'Anulada'
    default:
      return status
  }
}

export interface SaleDetailPageViewProps {
  sale: Sale
  onBack: () => void
  onPrint: (sale: Sale) => void | Promise<void>
  onCancel?: (saleId: string, reason: string) => Promise<{ success: boolean; totalRefund?: number }>
  onEditDraft?: (sale: Sale) => void
  onFinalizeDraft?: (saleId: string) => Promise<void>
}

export function SaleDetailPageView({
  sale,
  onBack,
  onPrint,
  onCancel,
  onEditDraft,
  onFinalizeDraft,
}: SaleDetailPageViewProps) {
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const isFinalizingRef = useRef(false)
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null)
  const cancelFormRef = useRef<HTMLDivElement>(null)
  const [credit, setCredit] = useState<Credit | null>(null)
  const [transfer, setTransfer] = useState<StoreStockTransfer | null>(null)

  useEffect(() => {
    const loadCredit = async () => {
      if (sale.paymentMethod === 'credit' && sale.id) {
        try {
          // 1:1 por sale_id — nunca por invoice_number (puede estar duplicado)
          const creditData = await CreditsService.getCreditBySaleId(sale.id, {
            ignoreStoreFilter: true,
          })
          setCredit(creditData)
        } catch {
          setCredit(null)
        }
      } else {
        setCredit(null)
      }
    }
    loadCredit()
  }, [sale])

  useEffect(() => {
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const loadTransfer = async () => {
      if (sale.storeId === MAIN_STORE_ID) {
        try {
          const transferData = await StoreStockTransferService.getTransferBySaleId(sale.id)
          setTransfer(transferData)
        } catch {
          setTransfer(null)
        }
      } else {
        setTransfer(null)
      }
    }
    loadTransfer()
  }, [sale])

  useEffect(() => {
    if (showCancelForm && cancelFormRef.current) {
      cancelFormRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [showCancelForm])

  useEffect(() => {
    if (sale.status === 'cancelled') {
      setShowCancelForm(false)
      setCancelReason('')
      setCancelSuccessMessage(null)
    }
  }, [sale.status])

  const getTransferId = (t: StoreStockTransfer): string => {
    if (t.transferNumber) return t.transferNumber.replace('TRF-', '')
    return t.id.substring(t.id.length - 8).toUpperCase()
  }

  const getInvoiceNumber = (s: Sale) => {
    const raw = s.invoiceNumber?.toString().trim() || ''
    if (!raw) return 'S/N'
    if (/^(CAP|CA2P|CA)-/i.test(raw) || raw.startsWith('#')) return raw
    return `#${raw.padStart(3, '0')}`
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const handleShowCancelForm = () => {
    setShowCancelForm(true)
    setCancelReason('')
    setCancelSuccessMessage(null)
  }

  const handleCancel = async () => {
    if (!cancelReason.trim() || !onCancel) return
    if (cancelReason.trim().length < 10) {
      setCancelSuccessMessage(
        '⚠️ El motivo de anulación debe tener al menos 10 caracteres para mayor claridad. Por favor, proporciona una descripción más detallada.'
      )
      return
    }
    setIsCancelling(true)
    setCancelSuccessMessage(null)
    try {
      const result = await onCancel(sale.id, cancelReason)
      if (result?.totalRefund && result.totalRefund > 0) {
        setCancelSuccessMessage(
          `Venta anulada exitosamente.\n\nReembolso total: $${result.totalRefund.toLocaleString()}\nProductos devueltos al stock\nCrédito y abonos anulados`
        )
      } else {
        setCancelSuccessMessage('Venta anulada exitosamente.\n\nProductos devueltos al stock')
      }
      setTimeout(() => {
        setShowCancelForm(false)
        setCancelReason('')
        setCancelSuccessMessage(null)
      }, 3000)
    } catch {
      setCancelSuccessMessage('Error al anular la venta. Por favor, inténtalo de nuevo.')
    } finally {
      setIsCancelling(false)
    }
  }

  const titleInvoice = getInvoiceNumber(sale)
  const isDraft = sale.status === 'draft'
  const canVoid = sale.status !== 'cancelled' && !isDraft && !transfer && Boolean(onCancel)
  const paidOnCredit = credit ? credit.paidAmount : sale.total
  const pendingCredit = credit ? Math.max(0, credit.pendingAmount) : 0

  const handleFinalizeDraft = async () => {
    if (!onFinalizeDraft || isFinalizingRef.current) return
    if (!confirm('¿Finalizar este borrador? Se descontará inventario y quedará como factura.')) return
    isFinalizingRef.current = true
    setIsFinalizing(true)
    try {
      await onFinalizeDraft(sale.id)
    } catch (error: any) {
      alert(error?.message || 'Error al finalizar el borrador')
    } finally {
      isFinalizingRef.current = false
      setIsFinalizing(false)
    }
  }

  const creditStatus = credit ? getEffectiveCreditStatus(credit) : null
  const statusLabel = creditStatus && sale.status !== 'cancelled' ? creditStatusLabel(creditStatus, credit) : saleStatusLabel(sale.status)
  const statusDotTone = statusTone(creditStatus && sale.status !== 'cancelled' ? creditStatus : sale.status)
  const unitsTotal = sale.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
  const paidAmount = sale.status === 'cancelled' ? 0 : paidOnCredit
  const creditHref = credit ? `/payments/${credit.clientId}/credit/${credit.id}` : null

  return (
    <div className="py-4 max-xl:pb-1 md:py-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">
            {isDraft ? 'Borrador' : 'Factura'} {titleInvoice}
          </h1>
          <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">
            {sale.clientId ? (
              <Link href={`/clients/${sale.clientId}`} className="underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-white">
                {sale.clientName}
              </Link>
            ) : (
              sale.clientName
            )}
            {isDraft ? ' · Pendiente de finalizar, no descuenta inventario' : null}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-700 dark:text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <StatusDot tone={statusDotTone} />
              {statusLabel}
            </span>
            <PaymentMethodLabel method={sale.paymentMethod} className="gap-1.5" />
            <span className="inline-flex items-center gap-1.5">
              <Calendar className={metaIconClass} strokeWidth={1.75} aria-hidden />
              <time dateTime={sale.createdAt}>{formatDateTime(sale.createdAt)}</time>
            </span>
            {sale.sellerName ? (
              <span className="inline-flex items-center gap-1.5">
                <User className={metaIconClass} strokeWidth={1.75} aria-hidden />
                {sale.sellerId ? (
                  <Link href={`/sellers/${sale.sellerId}`} className="underline-offset-2 hover:underline">
                    {sale.sellerName}
                  </Link>
                ) : (
                  sale.sellerName
                )}
              </span>
            ) : null}
            {transfer ? (
              <span className="inline-flex items-center gap-1.5">
                <ArrowRightLeft className={metaIconClass} strokeWidth={1.75} aria-hidden />
                <span className="font-mono text-xs">{transfer.transferNumber || `#${getTransferId(transfer)}`}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <button type="button" onClick={onBack} disabled={isCancelling} className={detailGhostClass}>
            <ArrowLeft strokeWidth={1.75} />
            Volver
          </button>
          {creditHref ? (
            <Link href={creditHref} className={detailGhostClass}>
              <CreditCard strokeWidth={1.75} />
              Crédito
            </Link>
          ) : null}
          {isDraft && onEditDraft && (
            <button type="button" onClick={() => onEditDraft(sale)} disabled={isFinalizing} className={detailGhostClass}>
              <Pencil strokeWidth={1.75} />
              Editar
            </button>
          )}
          {!isDraft && (
            <button type="button" onClick={() => void onPrint(sale)} disabled={isCancelling} className={detailGhostClass}>
              <Printer strokeWidth={1.75} />
              Imprimir
            </button>
          )}
          {isDraft && onFinalizeDraft && (
            <button type="button" onClick={() => void handleFinalizeDraft()} disabled={isFinalizing} className={detailPrimaryClass}>
              <CheckCircle2 strokeWidth={1.75} />
              {isFinalizing ? 'Finalizando…' : 'Finalizar'}
            </button>
          )}
          {canVoid && (
            <button type="button" onClick={handleShowCancelForm} disabled={isCancelling} className={detailDangerClass}>
              <Ban strokeWidth={1.75} />
              Anular
            </button>
          )}
        </div>
      </div>

      {cancelSuccessMessage && (
        <div
          className={cn(
            'mt-5 rounded-xl border px-4 py-3 text-[13px]',
            cancelSuccessMessage.includes('exitosamente')
              ? 'border-emerald-200 text-emerald-800 dark:border-emerald-400/20 dark:text-emerald-300'
              : 'border-rose-200 text-rose-700 dark:border-rose-400/20 dark:text-rose-300'
          )}
        >
          {cancelSuccessMessage.split('\n').filter(Boolean).map((line, index) => (
            <p key={index} className={index === 0 ? 'font-semibold' : 'mt-0.5'}>
              {line}
            </p>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Total</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
            {formatCurrency(sale.total)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">{credit ? 'Pagado' : 'Cobrado'}</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={paidAmount > 0 ? { color: REPORT_CHART_COLORS.tertiary } : undefined}
          >
            {formatCurrency(paidAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Pendiente</p>
          <p
            className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white"
            style={pendingCredit > 0 ? { color: REPORT_CHART_COLORS.primary } : undefined}
          >
            {formatCurrency(pendingCredit)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-white/50">Productos</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">
            {unitsTotal.toLocaleString('es-CO')}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-white/45">
            {sale.items.length} {sale.items.length === 1 ? 'referencia' : 'referencias'}
          </p>
        </div>
      </div>

      {sale.status === 'cancelled' && sale.cancellationReason ? (
        <section className="mt-8">
          <h2 className={cn(sectionTitleClass, 'text-rose-600 dark:text-rose-300')}>Motivo de anulación</h2>
          <p className="mt-1 whitespace-pre-wrap text-[13px] text-zinc-700 dark:text-white/80">{sale.cancellationReason}</p>
        </section>
      ) : null}

      {sale.paymentMethod === 'mixed' && sale.payments && sale.payments.length > 0 ? (
        <section className="mt-8">
          <h2 className={cn(sectionTitleClass, 'mb-3')}>Desglose del pago</h2>
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-white/[0.07] dark:border-white/[0.08]">
            {sale.payments.map((payment, index) => (
              <li key={index} className="flex items-center justify-between px-4 py-2.5 text-[13px] text-zinc-800 dark:text-zinc-200">
                <PaymentMethodLabel method={payment.paymentType} />
                <span className="font-medium tabular-nums">{formatCurrency(payment.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className={cn(sectionTitleClass, 'mb-3')}>Productos vendidos</h2>

        <div className="hidden overflow-hidden rounded-xl border border-zinc-200 dark:border-white/[0.08] md:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-white/[0.03]">
                <th className={thClass}>Producto</th>
                <th className={cn(thClass, 'text-right')}>Cant.</th>
                <th className={cn(thClass, 'text-right')}>Precio unit.</th>
                <th className={cn(thClass, 'text-right')}>Desc.</th>
                <th className={cn(thClass, 'text-right')}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map(item => {
                const baseTotal = item.quantity * item.unitPrice
                const discountAmount =
                  item.discountType === 'percentage' ? (baseTotal * (item.discount || 0)) / 100 : item.discount || 0
                const subtotal = Math.max(0, baseTotal - discountAmount)
                return (
                  <tr key={item.id} className="border-b border-zinc-100 last:border-0 dark:border-white/[0.05]">
                    <td className={tdClass}>
                      <p className="font-medium text-zinc-900 dark:text-white">{item.productName}</p>
                      <p className="text-xs text-zinc-500 dark:text-white/45">Ref. {item.productReferenceCode || 'N/A'}</p>
                    </td>
                    <td className={cn(tdClass, 'text-right tabular-nums')}>{item.quantity}</td>
                    <td className={cn(tdClass, 'text-right tabular-nums')}>{formatCurrency(item.unitPrice)}</td>
                    <td className={cn(tdClass, 'text-right tabular-nums text-zinc-500 dark:text-white/50')}>
                      {item.discount && item.discount > 0
                        ? item.discountType === 'percentage'
                          ? `${item.discount}%`
                          : formatCurrency(item.discount)
                        : '—'}
                    </td>
                    <td className={cn(tdClass, 'text-right font-medium tabular-nums')}>{formatCurrency(subtotal)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50 dark:border-white/[0.07] dark:bg-white/[0.03]">
                <td className={cn(tdClass, 'text-xs font-semibold')} colSpan={4}>
                  Total
                </td>
                <td className={cn(tdClass, 'text-right font-semibold tabular-nums')}>{formatCurrency(sale.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <ul className="divide-y divide-zinc-200 dark:divide-white/[0.07] md:hidden">
          {sale.items.map(item => {
            const baseTotal = item.quantity * item.unitPrice
            const discountAmount =
              item.discountType === 'percentage' ? (baseTotal * (item.discount || 0)) / 100 : item.discount || 0
            return (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 dark:text-white">{item.productName}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-zinc-500 dark:text-white/45">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                    {discountAmount > 0 ? ` · −${formatCurrency(discountAmount)}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-[13px] font-medium tabular-nums text-zinc-900 dark:text-white">
                  {formatCurrency(Math.max(0, baseTotal - discountAmount))}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      {sale.notes?.trim() ? (
        <section className="mt-8">
          <h2 className={sectionTitleClass}>Notas</h2>
          <p className="mt-1 whitespace-pre-wrap text-[13px] text-zinc-700 dark:text-white/80">{sale.notes.trim()}</p>
        </section>
      ) : null}

      {sale.status !== 'cancelled' && transfer ? (
        <p className="mt-8 flex items-center gap-2 text-[13px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          Esta factura solo puede anularse desde Traslados.
        </p>
      ) : null}

      {showCancelForm && (
        <section ref={cancelFormRef} className="mt-8 rounded-xl border border-zinc-200 p-4 dark:border-white/[0.08]">
          <h2 className={cn(sectionTitleClass, 'text-rose-600 dark:text-rose-300')}>Anular factura</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-white/50">
            Los productos vuelven al inventario. Describe el motivo con al menos 10 caracteres.
          </p>
          <textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Motivo de la anulación…"
            disabled={isCancelling}
            rows={3}
            className={cn(modalInputClass, 'mt-3 h-auto resize-none py-2')}
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                'text-xs tabular-nums',
                cancelReason.trim().length < 10 ? 'text-zinc-500 dark:text-white/45' : 'text-emerald-600 dark:text-emerald-400'
              )}
            >
              {cancelReason.trim().length}/10 caracteres
            </span>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setShowCancelForm(false)} disabled={isCancelling} className={detailGhostClass}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={cancelReason.trim().length < 10 || isCancelling}
                className={detailDangerClass}
              >
                {isCancelling ? 'Anulando…' : 'Confirmar anulación'}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

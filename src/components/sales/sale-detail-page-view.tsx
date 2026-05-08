'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Receipt,
  Calendar,
  CreditCard,
  AlertTriangle,
  Truck,
  FileText,
  ArrowLeft,
  Printer,
  Ban,
  ExternalLink,
  Hash,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Sale, Credit, StoreStockTransfer } from '@/types'
import { CreditsService } from '@/lib/credits-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import {
  creditStatusBadgeClass,
  creditStatusLabel,
  getEffectiveCreditStatus,
} from '@/lib/credit-status-ui'

const panel =
  'rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50'

const iconMuted = 'shrink-0 text-zinc-500 dark:text-zinc-300'

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  )
}

function saleStatusBadgeClass(status: string) {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-300/90'
    case 'pending':
      return 'border-amber-500/25 bg-amber-500/[0.06] text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300/90'
    case 'draft':
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
    case 'cancelled':
      return 'border-rose-500/30 bg-rose-500/[0.06] text-rose-900 dark:border-zinc-600 dark:bg-rose-950/35 dark:text-rose-200/90'
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
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
}

export function SaleDetailPageView({ sale, onBack, onPrint, onCancel }: SaleDetailPageViewProps) {
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null)
  const cancelFormRef = useRef<HTMLDivElement>(null)
  const [credit, setCredit] = useState<Credit | null>(null)
  const [transfer, setTransfer] = useState<StoreStockTransfer | null>(null)

  useEffect(() => {
    const loadCredit = async () => {
      if (sale.paymentMethod === 'credit' && sale.invoiceNumber) {
        try {
          const creditData = await CreditsService.getCreditByInvoiceNumber(sale.invoiceNumber)
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

  const getCreditId = (c: Credit): string => {
    const clientInitials = c.clientName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
      .padEnd(2, 'X')
    const creditSuffix = c.id.substring(c.id.length - 6).toLowerCase()
    return `${clientInitials}${creditSuffix}`
  }

  const getTransferId = (t: StoreStockTransfer): string => {
    if (t.transferNumber) return t.transferNumber.replace('TRF-', '')
    return t.id.substring(t.id.length - 8).toUpperCase()
  }

  const getInvoiceNumber = (s: Sale) => {
    if (s.invoiceNumber?.toString().startsWith('#')) return s.invoiceNumber.toString()
    return `#${s.invoiceNumber?.toString().padStart(3, '0') || '000'}`
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo/Contado'
      case 'credit':
        return 'Crédito'
      case 'nequi':
        return 'Nequi'
      case 'bancolombia':
        return 'Bancolombia'
      case 'transfer':
        return 'Transferencia (otro / sin canal)'
      case 'card':
        return 'Tarjeta'
      case 'warranty':
        return 'Garantía'
      case 'mixed':
        return 'Mixto'
      default:
        return method
    }
  }

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
  const canVoid = sale.status !== 'cancelled' && sale.status !== 'draft' && !transfer && Boolean(onCancel)
  const paidOnCredit = credit ? credit.paidAmount : sale.total
  const pendingCredit = credit ? Math.max(0, credit.pendingAmount) : 0

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 pb-28 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 xl:pb-8">
      <div className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex w-full min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-5 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <FileText className="h-6 w-6 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                Factura {titleInvoice}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Detalle del registro</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canVoid && (
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  'border-red-500/40 text-red-700 hover:bg-red-500/[0.08] dark:border-red-500/35 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/50'
                )}
                onClick={handleShowCancelForm}
                disabled={isCancelling}
              >
                <Ban className="h-4 w-4" strokeWidth={1.5} />
                Anular factura
              </Button>
            )}
            <Button size="sm" variant="outline" type="button" onClick={() => void onPrint(sale)} disabled={isCancelling}>
              <Printer className="h-4 w-4" strokeWidth={1.5} />
              Imprimir ticket
            </Button>
            <button
              type="button"
              onClick={onBack}
              disabled={isCancelling}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-800 transition-colors',
                'hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70',
                'disabled:pointer-events-none disabled:opacity-50'
              )}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Volver
            </button>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 px-4 py-6 md:px-6">
        {cancelSuccessMessage && (
          <div
            className={cn(
              'mb-6 rounded-xl border-2 p-4',
              cancelSuccessMessage.includes('exitosamente')
                ? 'border-emerald-200 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/30'
                : 'border-red-200 bg-red-50/90 dark:border-red-800 dark:bg-red-950/30'
            )}
          >
            <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {cancelSuccessMessage.split('\n').map((line, index) => (
                <div key={index} className={index === 0 ? 'font-semibold' : ''}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <aside className="w-full min-w-0 shrink-0 lg:sticky lg:top-6 lg:w-80">
            <div className={panel}>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Estado de la venta</p>
                <div className="mt-3">
                  <Badge
                    variant="outline"
                    className={`inline-flex border px-2.5 py-1 text-sm font-medium ${saleStatusBadgeClass(sale.status)}`}
                  >
                    {saleStatusLabel(sale.status)}
                  </Badge>
                </div>
              </div>
              <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <div className="px-4 py-3">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Total</dt>
                  <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(sale.total)}
                  </dd>
                </div>
                {credit ? (
                  <>
                    <div className="px-4 py-3">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Pagado (crédito)</dt>
                      <dd className="mt-1 text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(credit.paidAmount)}
                      </dd>
                    </div>
                    <div className="px-4 py-3">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Pendiente</dt>
                      <dd
                        className={cn(
                          'mt-1 text-base font-semibold tabular-nums',
                          pendingCredit <= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {formatCurrency(pendingCredit)}
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-3">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Cobrado</dt>
                      <dd className="mt-1 text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(sale.status === 'cancelled' ? 0 : paidOnCredit)}
                      </dd>
                    </div>
                    <div className="px-4 py-3">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Pendiente</dt>
                      <dd className="mt-1 text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(0)}
                      </dd>
                    </div>
                  </>
                )}
                <div className="flex gap-3 px-4 py-3">
                  <Hash className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">ID interno</dt>
                    <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {sale.id}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  <Receipt className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Número de factura</dt>
                    <dd className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100">{titleInvoice}</dd>
                  </div>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  <Calendar className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Emisión</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{formatDate(sale.createdAt)}</dd>
                  </div>
                </div>
                {credit && (
                  <div className="flex gap-3 px-4 py-3">
                    <CreditCard className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Crédito</dt>
                      <dd className="mt-1">
                        <Link
                          href={`/payments/${credit.clientId}/credit/${credit.id}`}
                          className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          #{getCreditId(credit)}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </dd>
                    </div>
                  </div>
                )}
                {transfer &&
                  (sale.paymentMethod === 'transfer' ||
                    sale.paymentMethod === 'nequi' ||
                    sale.paymentMethod === 'bancolombia' ||
                    sale.paymentMethod === 'mixed') && (
                  <div className="flex gap-3 px-4 py-3">
                    <Truck className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Transferencia</dt>
                      <dd className="mt-1 font-mono text-sm text-cyan-700 dark:text-cyan-400">
                        {transfer.transferNumber || `#${getTransferId(transfer)}`}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            <div className={panel}>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Datos de la venta</h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Cliente, vendedor, método y referencias.</p>
              </div>
              <section className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <div className="px-4 py-5 md:px-6">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={sale.clientName || 'Cliente'}
                      seed={sale.clientId}
                      size="md"
                      className="ring-1 ring-zinc-200/80 dark:ring-zinc-700"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                        {sale.clientName}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400" title="ID interno">
                        {sale.clientId}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-5 md:px-6">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-8">
                    {sale.sellerName && (
                      <Field label="Vendedor">
                        {sale.sellerId ? (
                          <Link
                            href={`/sellers/${sale.sellerId}`}
                            className="inline-flex items-center gap-1 text-zinc-900 hover:underline dark:text-zinc-100"
                          >
                            {sale.sellerName}
                            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
                          </Link>
                        ) : (
                          sale.sellerName
                        )}
                      </Field>
                    )}
                    <Field label="Fecha y hora">{formatDateTime(sale.createdAt)}</Field>
                    <Field label="Tipo de pago">
                      <Badge
                        variant="outline"
                        className="mt-1 border-zinc-200/90 bg-zinc-50 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-200"
                      >
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </Badge>
                    </Field>
                    {credit && (
                      <Field label="ID crédito">
                        <Link
                          href={`/payments/${credit.clientId}/credit/${credit.id}`}
                          className="inline-flex items-center gap-1 font-mono text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          #{getCreditId(credit)}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Field>
                    )}
                  </dl>
                </div>
                {sale.paymentMethod === 'mixed' && sale.payments && sale.payments.length > 0 && (
                  <div className="px-4 py-5 md:px-6">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Desglose de pago mixto</h4>
                    <div className="space-y-2">
                      {sale.payments.map((payment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/40"
                        >
                          <Badge variant="outline" className="text-xs">
                            {getPaymentMethodLabel(payment.paymentType)}
                          </Badge>
                          <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {sale.status === 'cancelled' && sale.cancellationReason && (
                  <div className="px-4 py-5 md:px-6">
                    <div className="rounded-lg border border-red-200/80 bg-red-50/80 p-3 dark:border-red-900/40 dark:bg-red-950/25">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-red-800 dark:text-red-300">
                        Motivo de anulación
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                        {sale.cancellationReason}
                      </p>
                    </div>
                  </div>
                )}
                {sale.status !== 'cancelled' && transfer && (
                  <div className="px-4 py-5 md:px-6">
                    <p className="flex items-center gap-2 text-sm text-cyan-700 dark:text-cyan-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Esta factura solo puede anularse desde Transferencias.
                    </p>
                  </div>
                )}
              </section>
            </div>

            {credit && sale.paymentMethod === 'credit' && (
              <div className={panel}>
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    <CreditCard className={cn('h-4 w-4', iconMuted)} strokeWidth={1.5} />
                    Crédito asociado
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Enlazado a esta factura.</p>
                </div>
                <div className="px-4 py-5 md:px-6">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Saldo pendiente">
                      <span className="text-lg font-semibold tabular-nums">{formatCurrency(credit.pendingAmount)}</span>
                    </Field>
                    <Field label="Total crédito">{formatCurrency(credit.totalAmount)}</Field>
                    <Field label="Estado">
                      <Badge
                        variant="outline"
                        className={cn(
                          'mt-1 font-medium',
                          creditStatusBadgeClass(getEffectiveCreditStatus(credit), credit)
                        )}
                      >
                        {creditStatusLabel(getEffectiveCreditStatus(credit), credit)}
                      </Badge>
                    </Field>
                  </dl>
                  <Link
                    href={`/payments/${credit.clientId}/credit/${credit.id}`}
                    className={cn(
                      'mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50',
                      'dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70'
                    )}
                  >
                    Ver detalle del crédito y pagos
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                </div>
              </div>
            )}

            <div className={panel}>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  <DollarSign className={cn('h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  Productos vendidos
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Líneas facturadas en esta venta.</p>
              </div>
              <div className="p-4 pt-2 md:px-6 md:pb-5">
                <div className="overflow-x-auto overscroll-contain scrollbar-hide">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                        <th className="pb-2 pr-3">Producto</th>
                        <th className="pb-2 pr-3 text-center">Cant.</th>
                        <th className="pb-2 pr-3 text-right">Precio unit.</th>
                        <th className="pb-2 pr-3 text-center">Desc.</th>
                        <th className="pb-2 pr-3 text-right">Subtotal</th>
                        <th className="pb-2">Vendedor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {sale.items.map((item) => {
                        const baseTotal = item.quantity * item.unitPrice
                        const discountAmount =
                          item.discountType === 'percentage'
                            ? (baseTotal * (item.discount || 0)) / 100
                            : item.discount || 0
                        const subtotalAfterDiscount = Math.max(0, baseTotal - discountAmount)
                        return (
                          <tr key={item.id}>
                            <td className="py-3 pr-3 align-top">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.productName}</div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                Ref: {item.productReferenceCode || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-center align-top">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
                                {item.quantity}
                              </span>
                            </td>
                            <td className="py-3 pr-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="py-3 pr-3 text-center align-top text-zinc-600 dark:text-zinc-400">
                              {item.discount && item.discount > 0
                                ? item.discountType === 'percentage'
                                  ? `${item.discount}%`
                                  : formatCurrency(item.discount)
                                : '—'}
                            </td>
                            <td className="py-3 pr-3 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatCurrency(subtotalAfterDiscount)}
                            </td>
                            <td className="py-3 align-top text-zinc-600 dark:text-zinc-300">
                              <div>{sale.sellerName || '—'}</div>
                              {sale.sellerEmail && (
                                <div className="text-xs text-zinc-500 dark:text-zinc-500">{sale.sellerEmail}</div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {showCancelForm && (
              <div ref={cancelFormRef} className={panel}>
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
                    Anular factura
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Describe el motivo con al menos 10 caracteres.
                  </p>
                </div>
                <div className="space-y-4 px-4 py-5 md:px-6">
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Describe detalladamente el motivo de la anulación…"
                    disabled={isCancelling}
                    rows={4}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <div className="text-right text-xs text-zinc-500">
                    <span className={cancelReason.length < 10 ? 'text-red-600' : ''}>
                      {cancelReason.length}/10 caracteres mínimo
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowCancelForm(false)} disabled={isCancelling}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void handleCancel()}
                      disabled={!cancelReason.trim() || cancelReason.trim().length < 10 || isCancelling}
                    >
                      {isCancelling ? 'Anulando…' : 'Confirmar anulación'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

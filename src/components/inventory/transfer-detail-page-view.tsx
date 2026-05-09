'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  ArrowRightLeft,
  Calendar,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Hash,
  Package,
  Store as StoreIcon,
  User,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sale, StoreStockTransfer } from '@/types'

const panel =
  'rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50'

const iconMuted = 'shrink-0 text-zinc-500 dark:text-zinc-300'

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  )
}

/** Misma familia visual que el badge de estado en detalle de factura */
function transferStatusBadgeClass(status: string) {
  switch (status) {
    case 'pending':
    case 'in_transit':
      return 'border-amber-500/25 bg-amber-500/[0.06] text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300/90'
    case 'received':
      return 'border-brand-500/20 bg-brand-500/[0.06] text-brand-900 dark:border-brand-500/25 dark:bg-brand-950/40 dark:text-brand-300/90'
    case 'partially_received':
      return 'border-orange-500/25 bg-orange-500/[0.08] text-orange-900 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200'
    case 'cancelled':
      return 'border-rose-500/30 bg-rose-500/[0.06] text-rose-900 dark:border-zinc-600 dark:bg-rose-950/35 dark:text-rose-200/90'
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'in_transit':
      return 'En tránsito'
    case 'received':
      return 'Recibida'
    case 'partially_received':
      return 'Parcialmente recibida'
    case 'cancelled':
      return 'Cancelada'
    default:
      return status
  }
}

function getInvoiceDisplay(sale: Sale) {
  const n = sale.invoiceNumber?.toString()
  if (!n) return '—'
  if (n.startsWith('#')) return n
  return `#${n.padStart(3, '0')}`
}

export interface TransferDetailPageViewProps {
  transfer: StoreStockTransfer
  sale: Sale | null
  loadingSale: boolean
  formatCurrency: (n: number) => string
  onBack: () => void
  onDownloadPdf: () => void
  onRequestCancel?: () => void
  canCancel: boolean
}

export function TransferDetailPageView({
  transfer,
  sale,
  loadingSale,
  formatCurrency,
  onBack,
  onDownloadPdf,
  onRequestCancel,
  canCancel,
}: TransferDetailPageViewProps) {
  const isReceived = transfer.status === 'received' || transfer.status === 'partially_received'
  const totalQuantity =
    transfer.items && transfer.items.length > 0
      ? transfer.items.reduce((sum, item) => sum + item.quantity, 0)
      : transfer.quantity || 0

  const titleTrf = transfer.transferNumber || `#${transfer.id.slice(0, 8)}`

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 pb-28 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 xl:pb-8">
      <div className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex w-full min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-5 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <ArrowRightLeft className="h-6 w-6 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
            <div className="min-w-0">
              <h1 className="truncate font-mono text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                {titleTrf}
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Detalle del registro</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canCancel && onRequestCancel && (
              <Button
                size="sm"
                variant="outline"
                type="button"
                className={cn(
                  'border-red-500/40 text-red-700 hover:bg-red-500/[0.08] dark:border-red-500/35 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/50'
                )}
                onClick={onRequestCancel}
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
                Cancelar transferencia
              </Button>
            )}
            <Button size="sm" variant="outline" type="button" onClick={onDownloadPdf}>
              <Download className="h-4 w-4" strokeWidth={1.5} />
              Descargar PDF
            </Button>
            <button
              type="button"
              onClick={onBack}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-800 transition-colors',
                'hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70'
              )}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Volver
            </button>
          </div>
        </div>
      </div>

      <div className="w-full min-w-0 px-4 py-6 md:px-6">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <aside className="w-full min-w-0 shrink-0 lg:sticky lg:top-6 lg:w-80">
            <div className={panel}>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Estado</p>
                <div className="mt-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      'inline-flex border px-2.5 py-1 text-sm font-medium',
                      transferStatusBadgeClass(transfer.status)
                    )}
                  >
                    {statusLabel(transfer.status)}
                  </Badge>
                </div>
              </div>
              <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sale && (
                  <div className="px-4 py-3">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Total venta</dt>
                    <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(sale.total)}
                    </dd>
                  </div>
                )}
                <div className="px-4 py-3">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Unidades</dt>
                  <dd className="mt-1 text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {totalQuantity}
                  </dd>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  <Hash className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  <div className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">ID interno</dt>
                    <dd className="mt-1 break-all font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {transfer.id}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  <FileText className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Número de transferencia</dt>
                    <dd className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100">{titleTrf}</dd>
                  </div>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  <Calendar className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Creación</dt>
                    <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{formatDateTime(transfer.createdAt)}</dd>
                  </div>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  <StoreIcon className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Desde</dt>
                    <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {transfer.fromStoreName || '—'}
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3 px-4 py-3">
                  <StoreIcon className={cn('mt-0.5 h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  <div className="min-w-0 flex-1">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Hacia</dt>
                    <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {transfer.toStoreName || '—'}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-6">
            <div className={panel}>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Datos de la transferencia</h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Origen, destino y registro.</p>
              </div>
              <section className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {transfer.description && (
                  <div className="px-4 py-5 md:px-6">
                    <Field label="Descripción">{transfer.description}</Field>
                  </div>
                )}
                <div className="px-4 py-5 md:px-6">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-8">
                    {transfer.createdByName && (
                      <Field label="Creado por">
                        <span className="inline-flex items-center gap-2">
                          <User className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                          {transfer.createdByName}
                        </span>
                      </Field>
                    )}
                    {isReceived && transfer.receivedAt && (
                      <Field label="Recepción">
                        {formatDateTime(transfer.receivedAt)}
                        {transfer.receivedByName ? ` · ${transfer.receivedByName}` : ''}
                      </Field>
                    )}
                  </dl>
                </div>
              </section>
            </div>

            {transfer.fromStoreId === MAIN_STORE_ID && (
              <div className={panel}>
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    <DollarSign className={cn('h-4 w-4', iconMuted)} strokeWidth={1.5} />
                    Venta asociada
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Facturación vinculada a esta transferencia.</p>
                </div>
                <div className="px-4 py-5 md:px-6">
                  {loadingSale ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando venta…</p>
                  ) : sale ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Factura</p>
                          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                            {getInvoiceDisplay(sale)}
                          </p>
                          <p className="mt-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                            ID venta: <span className="break-all">{sale.id}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Total</p>
                          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatCurrency(sale.total)}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/sales/${sale.id}`}
                        className={cn(
                          'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50',
                          'dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70'
                        )}
                      >
                        Ver venta completa
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                      </Link>
                      {sale.payments && sale.payments.length > 0 ? (
                        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Pagos</h4>
                          <div className="space-y-2">
                            {sale.payments.map(p => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/40"
                              >
                                <span className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                  <CreditCard className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                                  {p.paymentType === 'cash'
                                    ? 'Efectivo'
                                    : p.paymentType === 'transfer'
                                      ? 'Transferencia'
                                      : p.paymentType}
                                </span>
                                <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                                  {formatCurrency(p.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/40">
                            <span className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                              <CreditCard className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                              {sale.paymentMethod === 'cash'
                                ? 'Efectivo/Contado'
                                : sale.paymentMethod === 'transfer'
                                  ? 'Transferencia (Nequi · Bancolombia)'
                                  : sale.paymentMethod === 'card'
                                    ? 'Tarjeta'
                                    : sale.paymentMethod === 'mixed'
                                      ? 'Mixto'
                                      : sale.paymentMethod}
                            </span>
                            <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                              {formatCurrency(sale.total)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No se encontró una venta vinculada a esta transferencia.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className={panel}>
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  <Package className={cn('h-4 w-4', iconMuted)} strokeWidth={1.5} />
                  Productos ({transfer.items?.length || 1})
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {isReceived
                    ? 'Detalle de recepción por producto: esperado, recibido y faltante.'
                    : 'Líneas enviadas en esta transferencia.'}
                </p>
              </div>
              <div className="p-4 pt-2 md:px-6 md:pb-5">
                {transfer.items && transfer.items.length > 0 ? (
                  <div className="overflow-x-auto overscroll-contain scrollbar-hide">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                          <th className="pb-2 pr-3">Producto</th>
                          <th className="pb-2 pr-3 text-center">Esperada</th>
                          <th className="pb-2 pr-3 text-center">Origen</th>
                          {isReceived && (
                            <>
                              <th className="pb-2 pr-3 text-center">Recibida</th>
                              <th className="pb-2 pr-3 text-center">Faltante</th>
                              <th className="pb-2 pr-3 text-center">Estado</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {transfer.items.map(item => {
                          const qtyRec =
                            item.quantityReceived !== undefined ? item.quantityReceived : item.quantity
                          const missingQty = Math.max(0, item.quantity - qtyRec)
                          const partial = isReceived && qtyRec < item.quantity
                          const noneReceived = isReceived && qtyRec <= 0
                          return (
                            <tr key={item.id}>
                              <td className="py-3 pr-3 align-top">
                                <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.productName}</div>
                                {item.productReference && (
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Ref: {item.productReference}</div>
                                )}
                              </td>
                              <td className="py-3 pr-3 text-center align-top">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
                                  {item.quantity}
                                </span>
                              </td>
                              <td className="py-3 pr-3 text-center align-top">
                                <Badge
                                  variant="outline"
                                  className="border-zinc-200/90 bg-zinc-50 text-xs text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-200"
                                >
                                  {item.fromLocation === 'warehouse'
                                    ? 'Bodega'
                                    : item.fromLocation === 'both'
                                      ? 'Local + bodega'
                                      : 'Local'}
                                </Badge>
                              </td>
                              {isReceived && (
                                <>
                                  <td className="py-3 pr-3 text-center align-top">
                                    <span
                                      className={cn(
                                        'font-semibold tabular-nums',
                                        partial ? 'text-amber-700 dark:text-amber-300' : 'text-brand-700 dark:text-brand-400'
                                      )}
                                    >
                                      {qtyRec}
                                    </span>
                                  </td>
                                  <td className="py-3 pr-3 text-center align-top">
                                    <span
                                      className={cn(
                                        'font-semibold tabular-nums',
                                        missingQty > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-zinc-500 dark:text-zinc-400'
                                      )}
                                    >
                                      {missingQty}
                                    </span>
                                  </td>
                                  <td className="py-3 pr-3 text-center align-top">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[11px]',
                                        noneReceived
                                          ? 'border-rose-500/30 bg-rose-500/[0.06] text-rose-900 dark:border-rose-500/35 dark:bg-rose-950/35 dark:text-rose-200/90'
                                          : partial
                                            ? 'border-orange-500/25 bg-orange-500/[0.08] text-orange-900 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-200'
                                            : 'border-brand-500/20 bg-brand-500/[0.06] text-brand-900 dark:border-brand-500/25 dark:bg-brand-950/40 dark:text-brand-300/90'
                                      )}
                                    >
                                      {noneReceived ? 'No recibida' : partial ? 'Parcial' : 'Completa'}
                                    </Badge>
                                  </td>
                                </>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/30">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{transfer.productName || 'Producto'}</div>
                    <div className="mt-1 text-sm tabular-nums text-zinc-700 dark:text-zinc-300">{totalQuantity} unidades</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

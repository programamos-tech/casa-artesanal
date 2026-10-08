'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, CalendarClock, Clock } from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { SupplierInvoiceDetailView } from '@/components/supplier-invoices/supplier-invoice-detail-view'
import { SupplierInvoiceHeaderActions } from '@/components/supplier-invoices/supplier-invoice-header-actions'
import { SupplierInvoiceModal } from '@/components/supplier-invoices/supplier-invoice-modal'
import { SupplierPaymentModal } from '@/components/supplier-invoices/supplier-payment-modal'
import {
  formatSupplierDate as formatDate,
  supplierDueDateClass,
  supplierInvoiceStatusLabel,
  supplierInvoiceStatusTone,
} from '@/components/supplier-invoices/supplier-invoice-status'
import { StatusDot } from '@/components/dashboard/report-ui'
import { SupplierInvoice } from '@/types'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { usePermissions } from '@/hooks/usePermissions'
import { useCashOperationGate } from '@/components/caja/cash-operation-gate-provider'
import { cn } from '@/lib/utils'

const detailGhostClass =
  'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white [&_svg]:size-3.5 [&_svg]:shrink-0'

const metaIconClass = 'h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-white/40'

export default function SupplierInvoiceDetailPage() {
  const params = useParams()
  const invoiceId = typeof params?.invoiceId === 'string' ? params.invoiceId : ''

  const { canCreate, canEdit, canCancel } = usePermissions()
  const { ensureCashReady } = useCashOperationGate()
  const [invoice, setInvoice] = useState<SupplierInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setInvoice(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await SupplierInvoicesService.getInvoiceById(invoiceId)
      setInvoice(data)
    } catch {
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    loadInvoice()
  }, [loadInvoice])

  const handleSaved = async () => {
    await loadInvoice()
    setInvoiceModalOpen(false)
  }

  const supplierHref = invoice
    ? `/purchases/invoices/supplier/${encodeURIComponent(invoice.supplierId || '__sin_proveedor__')}`
    : '/purchases/invoices'

  const showDue = Boolean(invoice?.dueDate) && invoice?.status !== 'paid' && invoice?.status !== 'cancelled'

  return (
    <RoleProtectedRoute module="supplier_invoices" requiredAction="view">
      <div className="py-4 max-xl:pb-1 md:py-6">
        {loading && !invoice ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
            <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando factura…</p>
          </div>
        ) : !invoice ? (
          <div className="py-16 text-center">
            <p className="text-base font-semibold text-zinc-900 dark:text-white">Factura no encontrada</p>
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-white/50">No existe o no tienes acceso desde esta tienda.</p>
            <Link href="/purchases/invoices" className={cn(detailGhostClass, 'mt-5')}>
              <ArrowLeft strokeWidth={1.75} />
              Volver al listado
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">
                  Factura <span className="font-mono">{invoice.invoiceNumber}</span>
                </h1>
                <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">
                  <Link href={supplierHref} className="underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-white">
                    {invoice.supplierName || 'Sin proveedor'}
                  </Link>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-700 dark:text-white/80">
                  <span className="inline-flex items-center gap-1.5">
                    <StatusDot tone={supplierInvoiceStatusTone(invoice.status)} />
                    {supplierInvoiceStatusLabel(invoice.status)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className={metaIconClass} strokeWidth={1.75} aria-hidden />
                    Emitida <time dateTime={invoice.issueDate} className="tabular-nums">{formatDate(invoice.issueDate)}</time>
                  </span>
                  {showDue ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className={metaIconClass} strokeWidth={1.75} aria-hidden />
                      Vence{' '}
                      <span className={cn('tabular-nums', supplierDueDateClass(invoice.dueDate))}>{formatDate(invoice.dueDate!)}</span>
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className={metaIconClass} strokeWidth={1.75} aria-hidden />
                    Registrada <span className="tabular-nums">{formatDate(invoice.createdAt)}</span>
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <Link href={supplierHref} className={detailGhostClass}>
                  <ArrowLeft strokeWidth={1.75} />
                  Volver
                </Link>
                <SupplierInvoiceHeaderActions
                  invoice={invoice}
                  invoiceLoading={false}
                  onRefresh={loadInvoice}
                  onOpenEdit={() => setInvoiceModalOpen(true)}
                  onOpenAddPayment={async () => {
                    if (!(await ensureCashReady('supplier'))) return
                    setPaymentModalOpen(true)
                  }}
                  canRecordPayment={canCreate('supplier_invoices')}
                  canEdit={canEdit('supplier_invoices')}
                  canCancel={canCancel('supplier_invoices')}
                />
              </div>
            </div>

            <SupplierInvoiceDetailView
              invoice={invoice}
              canEdit={canEdit('supplier_invoices')}
              canCancelPayments={canCancel('supplier_invoices') || canCancel('supplier_payments')}
              onPaymentCancelled={loadInvoice}
            />
          </>
        )}

        <SupplierInvoiceModal
          isOpen={invoiceModalOpen}
          onClose={() => setInvoiceModalOpen(false)}
          onSaved={handleSaved}
          invoice={invoice}
        />

        <SupplierPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          invoice={invoice}
          onAddPayment={loadInvoice}
        />
      </div>
    </RoleProtectedRoute>
  )
}

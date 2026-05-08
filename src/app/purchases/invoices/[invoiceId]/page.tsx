'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { SupplierInvoiceDetailView } from '@/components/supplier-invoices/supplier-invoice-detail-view'
import { SupplierInvoiceHeaderActions } from '@/components/supplier-invoices/supplier-invoice-header-actions'
import { SupplierInvoiceModal } from '@/components/supplier-invoices/supplier-invoice-modal'
import { SupplierPaymentModal } from '@/components/supplier-invoices/supplier-payment-modal'
import { SupplierInvoice } from '@/types'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

export default function SupplierInvoiceDetailPage() {
  const params = useParams()
  const invoiceId = typeof params?.invoiceId === 'string' ? params.invoiceId : ''
  const shortId = invoiceId ? invoiceId.slice(-6) : ''

  const { canCreate, canEdit, canCancel } = usePermissions()
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

  return (
    <RoleProtectedRoute module="supplier_invoices" requiredAction="view">
      <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 pb-28 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900 xl:pb-8">
        <div className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex w-full min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-5 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <FileText className="h-6 w-6 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                  ID de factura
                  {shortId ? (
                    <span className="ml-1.5 font-mono text-base font-normal text-zinc-500 dark:text-zinc-400">
                      ·{shortId}
                    </span>
                  ) : null}
                </h1>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {invoice?.invoiceNumber
                    ? `Folio ${invoice.invoiceNumber}`
                    : loading
                      ? 'Cargando…'
                      : 'Detalle del registro'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <SupplierInvoiceHeaderActions
                invoice={invoice}
                invoiceLoading={loading}
                onRefresh={loadInvoice}
                onOpenEdit={() => setInvoiceModalOpen(true)}
                onOpenAddPayment={() => setPaymentModalOpen(true)}
                canRecordPayment={canCreate('supplier_invoices')}
                canEdit={canEdit('supplier_invoices')}
                canCancel={canCancel('supplier_invoices')}
              />
              <Link
                href={
                  invoice?.supplierId
                    ? `/purchases/invoices/supplier/${encodeURIComponent(invoice.supplierId)}`
                    : invoice
                      ? `/purchases/invoices/supplier/${encodeURIComponent('__sin_proveedor__')}`
                      : '/purchases/invoices'
                }
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-medium text-zinc-800 transition-colors',
                  'hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-200 dark:hover:bg-zinc-900/70'
                )}
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
                Volver
              </Link>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 px-4 py-6 md:px-6">
          <SupplierInvoiceDetailView
            invoice={invoice}
            invoiceLoading={loading}
            canEdit={canEdit('supplier_invoices')}
          />
        </div>

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

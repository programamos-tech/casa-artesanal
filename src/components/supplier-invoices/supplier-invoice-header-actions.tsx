'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Ban, AlertTriangle, X } from 'lucide-react'
import { SupplierInvoice } from '@/types'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SupplierInvoiceHeaderActionsProps {
  invoice: SupplierInvoice | null
  invoiceLoading: boolean
  onRefresh: () => void | Promise<void>
  onOpenEdit: () => void
  onOpenAddPayment: () => void
  canRecordPayment: boolean
  canEdit: boolean
  canCancel: boolean
}

export function SupplierInvoiceHeaderActions({
  invoice,
  invoiceLoading,
  onRefresh,
  onOpenEdit,
  onOpenAddPayment,
  canRecordPayment,
  canEdit,
  canCancel,
}: SupplierInvoiceHeaderActionsProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  if (invoiceLoading || !invoice) {
    return null
  }

  const pending = Math.max(0, invoice.totalAmount - invoice.paidAmount)
  const canPay =
    canRecordPayment && invoice.status !== 'cancelled' && invoice.status !== 'paid' && pending > 0
  const canEditInvoice = canEdit && invoice.status !== 'cancelled' && invoice.status !== 'paid'
  const canCancelInvoice = canCancel && invoice.status !== 'cancelled'

  const openCancelModal = () => {
    setCancelReason('')
    setCancelModalOpen(true)
  }

  const closeCancelModal = () => {
    if (cancelling) return
    setCancelModalOpen(false)
    setCancelReason('')
  }

  const confirmCancelInvoice = async () => {
    const trimmed = cancelReason.trim()
    if (!trimmed) {
      toast.error('Escribe el motivo de la anulación')
      return
    }
    setCancelling(true)
    try {
      await SupplierInvoicesService.cancelInvoice(invoice.id, trimmed)
      toast.success('Factura anulada')
      setCancelModalOpen(false)
      setCancelReason('')
      await onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al anular')
    } finally {
      setCancelling(false)
    }
  }

  if (!canPay && !canEditInvoice && !canCancelInvoice) {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canPay && (
          <Button size="sm" onClick={onOpenAddPayment}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            Registrar abono
          </Button>
        )}
        {canEditInvoice && (
          <Button size="sm" variant="outline" onClick={onOpenEdit}>
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
            Editar
          </Button>
        )}
        {canCancelInvoice && (
          <Button
            size="sm"
            variant="outline"
            className={cn(
              'border-red-500/40 text-red-700 hover:bg-red-500/[0.08] dark:border-red-500/35 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/50'
            )}
            onClick={openCancelModal}
          >
            <Ban className="h-4 w-4" strokeWidth={1.5} />
            Anular factura
          </Button>
        )}
      </div>

      {cancelModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm xl:left-56"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-invoice-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
              <div className="flex min-w-0 items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                <h2 id="cancel-invoice-title" className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Anular factura
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 min-h-0 w-8 shrink-0 rounded-lg p-0"
                onClick={closeCancelModal}
                disabled={cancelling}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4 p-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Los abonos registrados permanecen en el historial.
              </p>
              <div className="space-y-2">
                <Label htmlFor="cancel-reason-header">¿Por qué anulas esta factura?</Label>
                <textarea
                  id="cancel-reason-header"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  disabled={cancelling}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Ej. factura duplicada, error de proveedor, acuerdo comercial…"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/80">
              <Button type="button" variant="outline" onClick={closeCancelModal} disabled={cancelling}>
                Volver
              </Button>
              <Button type="button" variant="destructive" onClick={confirmCancelInvoice} disabled={cancelling}>
                {cancelling ? 'Anulando…' : 'Anular factura'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { HandCoins, Pencil, Ban, X } from 'lucide-react'
import { SupplierInvoice } from '@/types'
import { SupplierInvoicesService } from '@/lib/supplier-invoices-service'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  modalBodyClass,
  modalCloseButtonClass,
  modalDangerButtonClass,
  modalFooterClass,
  modalHeaderClass,
  modalHintClass,
  modalInputClass,
  modalLabelClass,
  modalOverlayClass,
  modalPanelClass,
  modalSecondaryButtonClass,
  modalSubtitleClass,
  modalTitleClass,
} from '@/lib/app-modal'

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
      {canEditInvoice && (
        <button type="button" onClick={onOpenEdit} className={detailGhostClass}>
          <Pencil strokeWidth={1.75} />
          Editar
        </button>
      )}
      {canCancelInvoice && (
        <button type="button" onClick={openCancelModal} className={detailDangerClass}>
          <Ban strokeWidth={1.75} />
          Anular
        </button>
      )}
      {canPay && (
        <button type="button" onClick={onOpenAddPayment} className={detailPrimaryClass}>
          <HandCoins strokeWidth={1.75} />
          Abonar
        </button>
      )}

      {cancelModalOpen && (
        <div className={modalOverlayClass} role="dialog" aria-modal="true" aria-labelledby="cancel-invoice-title">
          <div className={cn(modalPanelClass, 'max-w-md')}>
            <div className={modalHeaderClass}>
              <div className="min-w-0">
                <h2 id="cancel-invoice-title" className={modalTitleClass}>
                  Anular factura
                </h2>
                <p className={modalSubtitleClass}>{invoice.invoiceNumber}</p>
              </div>
              <button
                type="button"
                className={modalCloseButtonClass}
                onClick={closeCancelModal}
                disabled={cancelling}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className={modalBodyClass}>
              <label htmlFor="cancel-reason-header" className={modalLabelClass}>
                ¿Por qué anulas esta factura?
              </label>
              <textarea
                id="cancel-reason-header"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                disabled={cancelling}
                className={cn(modalInputClass, 'h-auto resize-none py-2')}
                placeholder="Ej. factura duplicada, error de proveedor, acuerdo comercial…"
              />
              <p className={modalHintClass}>Los abonos registrados permanecen en el historial.</p>
            </div>
            <div className={modalFooterClass}>
              <button type="button" className={modalSecondaryButtonClass} onClick={closeCancelModal} disabled={cancelling}>
                Volver
              </button>
              <button type="button" className={modalDangerButtonClass} onClick={confirmCancelInvoice} disabled={cancelling}>
                {cancelling ? 'Anulando…' : 'Anular factura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

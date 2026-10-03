'use client'

import { Lock, LockOpen, X } from 'lucide-react'
import {
  modalBodyClass,
  modalCloseButtonClass,
  modalFooterClass,
  modalHeaderClass,
  modalOverlayClass,
  modalPanelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalTitleClass,
} from '@/lib/app-modal'
import { StatusDot } from '@/components/dashboard/report-ui'
import {
  getCashGateBody,
  getCashGateTitle,
  type CashGateAction,
  type CashGateStatus,
} from '@/lib/cash-operation-gate'
import { cn } from '@/lib/utils'

interface CashRequiredModalProps {
  isOpen: boolean
  status: Exclude<CashGateStatus, 'ok'>
  action: CashGateAction
  onDismiss: () => void
  onGoToCaja: () => void
}

export function CashRequiredModal({
  isOpen,
  status,
  action,
  onDismiss,
  onGoToCaja,
}: CashRequiredModalProps) {
  if (!isOpen) return null

  const isClose = status === 'must_close'

  return (
    <div className={cn(modalOverlayClass, 'z-[110]')} role="presentation">
      <div
        className={cn(modalPanelClass, 'max-w-md')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-required-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={modalHeaderClass}>
          <div className="min-w-0">
            <h2 id="cash-required-title" className={cn(modalTitleClass, 'truncate')}>
              {getCashGateTitle(status)}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-zinc-500 dark:text-white/50">
              <StatusDot tone={isClose ? 'warning' : 'neutral'} />
              {isClose ? 'Turno de ayer sin cerrar' : 'Caja cerrada'}
            </p>
          </div>
          <button type="button" className={modalCloseButtonClass} onClick={onDismiss} aria-label="Cerrar">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className={modalBodyClass}>
          <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-white/80">
            {getCashGateBody(status, action)}
          </p>
          <p className="mt-2 text-[13px] text-zinc-500 dark:text-white/50">
            {isClose
              ? 'Cierra el turno de ayer en Caja. Después abre la caja de hoy para seguir.'
              : 'Abre la caja del día y luego vuelve a intentar.'}
          </p>
        </div>

        <div className={modalFooterClass}>
          <button type="button" className={modalSecondaryButtonClass} onClick={onDismiss}>
            Cancelar
          </button>
          <button type="button" className={modalPrimaryButtonClass} onClick={onGoToCaja}>
            {isClose ? <Lock className="h-3.5 w-3.5" strokeWidth={1.75} /> : <LockOpen className="h-3.5 w-3.5" strokeWidth={1.75} />}
            {isClose ? 'Ir a cerrar caja' : 'Ir a abrir caja'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { Lock, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  appModalBodyClass,
  appModalFooterClass,
  appModalHeaderClass,
  appModalPanelClass,
} from '@/lib/app-modal'
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
    <div
      className="casa-artesanal-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center overflow-hidden overscroll-none bg-zinc-950/25 p-3 backdrop-blur-[2px] dark:bg-black/40 sm:p-5 xl:left-60"
      role="presentation"
    >
      <div
        className={cn(appModalPanelClass, 'max-w-md')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-required-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2">
            {isClose ? (
              <Lock className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={1.75} />
            ) : (
              <Wallet className="h-5 w-5 shrink-0 text-emerald-600" strokeWidth={1.75} />
            )}
            <h2
              id="cash-required-title"
              className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {getCashGateTitle(status)}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-md p-0"
            onClick={onDismiss}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        <div className={appModalBodyClass}>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {getCashGateBody(status, action)}
          </p>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            {isClose
              ? 'Cierra el turno de ayer en Caja. Después abre la caja de hoy para seguir.'
              : 'Abre la caja del día y luego vuelve a intentar.'}
          </p>
        </div>

        <div className={appModalFooterClass}>
          <Button type="button" variant="outline" onClick={onDismiss}>
            Cancelar
          </Button>
          <Button type="button" onClick={onGoToCaja}>
            {isClose ? 'Ir a cerrar caja' : 'Ir a abrir caja'}
          </Button>
        </div>
      </div>
    </div>
  )
}

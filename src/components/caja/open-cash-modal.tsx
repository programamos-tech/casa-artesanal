'use client'

import { useEffect, useState } from 'react'
import { X, LockOpen } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { CashSessionsService } from '@/lib/cash-sessions-service'
import {
  modalBodyClass,
  modalCloseButtonClass,
  modalFooterClass,
  modalHeaderClass,
  modalHintClass,
  modalInputClass,
  modalLabelClass,
  modalOverlayClass,
  modalPanelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSubtitleClass,
  modalTitleClass,
} from '@/lib/app-modal'
import { cn } from '@/lib/utils'
import { useSubmitLock } from '@/hooks/use-submit-lock'
import { toast } from 'sonner'

interface OpenCashModalProps {
  isOpen: boolean
  onClose: () => void
  onOpened: () => void | Promise<void>
}

export function OpenCashModal({ isOpen, onClose, onOpened }: OpenCashModalProps) {
  const { user } = useAuth()
  const [openingCash, setOpeningCash] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const { locked: submitLocked, run: runSubmit } = useSubmitLock()

  useEffect(() => {
    if (isOpen) {
      setOpeningCash('')
      setNotes('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const amount = parseInt(openingCash.replace(/[^\d]/g, ''), 10) || 0

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Sesión no válida')
      return
    }
    setSaving(true)
    try {
      const result = await CashSessionsService.openSession({
        openingCash: amount,
        notes,
        userId: user.id,
        userName: user.name,
      })
      if (!result.success) {
        toast.error(result.error || 'No se pudo abrir')
        return
      }
      await onOpened()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={modalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(modalPanelClass, 'max-w-md')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-cash-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={modalHeaderClass}>
          <div className="min-w-0">
            <h2 id="open-cash-modal-title" className={modalTitleClass}>
              Abrir caja
            </h2>
            <p className={modalSubtitleClass}>Inicia el turno del día.</p>
          </div>
          <button type="button" className={modalCloseButtonClass} onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className={cn(modalBodyClass, 'space-y-4')}>
          <div>
            <label htmlFor="open-cash-amount" className={modalLabelClass}>
              Dinero base (fondo inicial)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-zinc-400 dark:text-white/35">
                $
              </span>
              <input
                id="open-cash-amount"
                type="text"
                inputMode="numeric"
                value={openingCash ? amount.toLocaleString('es-CO') : ''}
                onChange={(e) => setOpeningCash(e.target.value.replace(/[^\d]/g, ''))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={cn(modalInputClass, 'h-11 pl-7 text-lg font-semibold tabular-nums')}
                autoFocus
              />
            </div>
            <p className={modalHintClass}>
              Efectivo con el que inicias el día en caja (opcional). Sirve para cuadrar al cierre.
            </p>
          </div>
          <div>
            <label htmlFor="open-cash-notes" className={modalLabelClass}>
              Nota <span className="font-normal text-zinc-400 dark:text-white/35">(opcional)</span>
            </label>
            <textarea
              id="open-cash-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. turno mañana"
              rows={2}
              className={cn(modalInputClass, 'h-auto resize-none py-2')}
            />
          </div>
        </div>
        <div className={modalFooterClass}>
          <button type="button" className={modalSecondaryButtonClass} onClick={onClose} disabled={saving || submitLocked}>
            Cancelar
          </button>
          <button
            type="button"
            className={modalPrimaryButtonClass}
            onClick={() => void runSubmit(handleSubmit)}
            disabled={saving || submitLocked}
          >
            <LockOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
            {saving || submitLocked ? 'Abriendo…' : 'Abrir caja'}
          </button>
        </div>
      </div>
    </div>
  )
}

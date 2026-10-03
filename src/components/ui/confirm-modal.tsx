'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  modalCloseButtonClass,
  modalDangerButtonClass,
  modalOverlayClass,
  modalPanelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalTitleClass,
} from '@/lib/app-modal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
}: ConfirmModalProps) {
  if (!isOpen) return null

  const confirmClass =
    type === 'danger'
      ? modalDangerButtonClass
      : type === 'warning'
        ? cn(modalPrimaryButtonClass, 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400')
        : modalPrimaryButtonClass

  return (
    <div className={modalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(modalPanelClass, 'max-w-md')}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <h2 id="confirm-modal-title" className={modalTitleClass}>
            {title}
          </h2>
          <button type="button" onClick={onClose} className={cn(modalCloseButtonClass, '-mt-1.5')} aria-label="Cerrar">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <p id="confirm-modal-desc" className="px-6 pt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-white/60">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2 px-6 pb-5 pt-6">
          <button type="button" onClick={onClose} className={modalSecondaryButtonClass} autoFocus>
            {cancelText}
          </button>
          <button type="button" onClick={onConfirm} className={confirmClass}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

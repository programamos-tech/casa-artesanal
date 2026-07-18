'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  appModalBodyClass,
  appModalFooterClass,
  appModalHeaderClass,
  appModalOverlayClass,
  appModalPanelClass,
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

  const Icon = type === 'info' ? Info : AlertTriangle
  const iconClass =
    type === 'danger'
      ? 'text-rose-600 dark:text-rose-400'
      : type === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-zinc-500 dark:text-zinc-400'

  return (
    <div className={appModalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        onClick={event => event.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon className={cn('h-5 w-5 shrink-0', iconClass)} strokeWidth={1.75} />
            <h2
              id="confirm-modal-title"
              className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {title}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 min-h-0 w-8 shrink-0 rounded-md p-0"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className={cn(appModalBodyClass, 'sm:overflow-y-auto')}>
          <p
            id="confirm-modal-desc"
            className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
          >
            {message}
          </p>
        </div>

        <div className={appModalFooterClass}>
          <Button type="button" variant="destructive" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={type === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            className={cn(
              type === 'warning' &&
                'border-amber-600/90 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
            )}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

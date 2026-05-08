'use client'

import { Button } from '@/components/ui/button'
import { AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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

const overlayClass =
  'fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm xl:left-56'

const shellClass =
  'w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900'

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
      ? 'text-red-600 dark:text-red-400'
      : type === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-zinc-500 dark:text-zinc-400'

  return (
    <div className={overlayClass} role="presentation">
      <div
        className={shellClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950/80">
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon className={cn('h-5 w-5 shrink-0', iconClass)} strokeWidth={1.5} />
            <h2 id="confirm-modal-title" className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 min-h-0 w-8 shrink-0 rounded-lg p-0"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          <p id="confirm-modal-desc" className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={type === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
            className={cn(type === 'warning' && 'border-amber-600/90 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700')}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

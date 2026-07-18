'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'warning'
  isLoading?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  variant = 'destructive',
  isLoading = false,
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-0 border-b border-zinc-200 px-5 py-3.5 text-left dark:border-zinc-700">
          <div className="flex items-center gap-2.5 pr-8">
            {variant === 'destructive' ? (
              <Trash2 className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" strokeWidth={1.75} />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
            )}
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-white px-5 py-3 dark:border-zinc-700 dark:bg-zinc-950">
          <Button variant="destructive" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              variant === 'warning' &&
                'border-amber-600/90 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
            )}
          >
            {isLoading ? 'Eliminando…' : confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

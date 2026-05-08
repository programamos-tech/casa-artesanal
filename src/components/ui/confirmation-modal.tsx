'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2 } from 'lucide-react'

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
  isLoading = false
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full ${
              variant === 'destructive' 
                ? 'bg-red-100 dark:bg-red-900/20' 
                : 'bg-yellow-100 dark:bg-yellow-900/20'
            }`}>
              {variant === 'destructive' ? (
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="px-6"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Eliminando...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

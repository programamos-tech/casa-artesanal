'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  AlertTriangle, 
  X 
} from 'lucide-react'

interface CancelTransferModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  transferNumber?: string
  isLoading?: boolean
}

export function CancelTransferModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  transferNumber,
  isLoading = false
}: CancelTransferModalProps) {
  const [reason, setReason] = useState('')

  // Limpiar el motivo cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setReason('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 xl:px-6">
      <div className="bg-white dark:bg-neutral-950 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-neutral-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-neutral-700 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-red-900/20">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-red-400" />
            </div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
              Cancelar Transferencia
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4">
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            ¿Estás seguro de que quieres cancelar la transferencia{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {transferNumber || 'N/A'}
            </span>?
          </p>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Importante:</strong> Esta acción devolverá el stock a la tienda origen y cancelará la venta asociada (si existe), devolviendo el dinero ingresado.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Motivo de cancelación <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica por qué se cancela esta transferencia..."
              className="w-full min-h-[100px] px-3 py-2 border-2 border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-50 resize-none text-sm"
              disabled={isLoading}
              rows={4}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Este motivo quedará registrado en el log de actividades.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-end space-x-3 bg-white p-4 pt-6 dark:bg-neutral-950 md:p-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={isLoading}
          >
            No Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? 'Cancelando...' : 'Cancelar Transferencia'}
          </Button>
        </div>
      </div>
    </div>
  )
}

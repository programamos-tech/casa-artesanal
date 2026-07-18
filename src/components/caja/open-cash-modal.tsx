'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, LockOpen } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { CashSessionsService } from '@/lib/cash-sessions-service'
import { appModalOverlayClass, appModalPanelClass } from '@/lib/app-modal'
import { cn } from '@/lib/utils'
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
    <div className={appModalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-md')}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <LockOpen className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Abrir caja</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>Dinero base (fondo inicial)</Label>
            <input
              type="text"
              inputMode="numeric"
              value={openingCash ? amount.toLocaleString('es-CO') : ''}
              onChange={(e) => setOpeningCash(e.target.value.replace(/[^\d]/g, ''))}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-lg font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
              autoFocus
            />
            <p className="text-xs text-zinc-500">
              Efectivo con el que inicias el día en caja (opcional). Sirve para cuadrar al cierre.
            </p>
          </div>
          <div className="space-y-2">
            <Label>
              Nota <span className="font-normal text-zinc-500">(opcional)</span>
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. turno mañana"
              rows={2}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
          <Button type="button" variant="destructive" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? 'Abriendo…' : 'Abrir caja'}
          </Button>
        </div>
      </div>
    </div>
  )
}

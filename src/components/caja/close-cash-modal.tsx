'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { CashSessionsService } from '@/lib/cash-sessions-service'
import type { CashSession, CashSessionLiveSummary } from '@/types'
import { appModalOverlayClass, appModalPanelClass } from '@/lib/app-modal'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CloseCashModalProps {
  isOpen: boolean
  session: CashSession
  live: CashSessionLiveSummary | null
  onClose: () => void
  onClosed: () => void | Promise<void>
}

function money(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export function CloseCashModal({ isOpen, session, live, onClose, onClosed }: CloseCashModalProps) {
  const { user } = useAuth()
  const [countedCash, setCountedCash] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<CashSessionLiveSummary | null>(live)

  useEffect(() => {
    if (!isOpen) return
    setCountedCash(String(Math.round(live?.expectedCash ?? session.openingCash)))
    setNotes('')
    setSummary(live)
    void CashSessionsService.computeLiveSummary(session).then(setSummary)
  }, [isOpen, session, live])

  if (!isOpen) return null

  const counted = parseInt(countedCash.replace(/[^\d]/g, ''), 10) || 0
  const expected = summary?.expectedCash ?? session.openingCash
  const diff = counted - expected

  const notifyWhatsApp = async (sessionId: string, previewWindow: Window | null) => {
    try {
      const res = await fetch('/api/caja/notify-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        previewWindow?.close()
        toast.message('Caja cerrada', {
          description: 'No se pudo preparar el WhatsApp del informe.',
        })
        return
      }
      if (data.sent) {
        previewWindow?.close()
        toast.success('Informe enviado por WhatsApp al +57 320 5689053')
        return
      }
      if (data.whatsappUrl) {
        if (previewWindow) {
          previewWindow.location.href = data.whatsappUrl
        } else {
          window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer')
        }
        toast.success('Caja cerrada', {
          description: 'Se abrió WhatsApp con el informe. Confirma Enviar.',
        })
        return
      }
      previewWindow?.close()
      toast.success('Caja cerrada')
    } catch {
      previewWindow?.close()
      toast.message('Caja cerrada', {
        description: 'Revisa el historial; el WhatsApp no se pudo abrir.',
      })
    }
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Sesión no válida')
      return
    }
    // Abrir ya la pestaña (gesto del usuario) para no bloquear el WhatsApp después del await
    const previewWindow = window.open('about:blank', '_blank')
    setSaving(true)
    try {
      const result = await CashSessionsService.closeSession({
        sessionId: session.id,
        countedCash: counted,
        notes,
        userId: user.id,
        userName: user.name,
      })
      if (!result.success) {
        previewWindow?.close()
        toast.error(result.error || 'No se pudo cerrar')
        return
      }
      if (result.session?.id) {
        await notifyWhatsApp(result.session.id, previewWindow)
      } else {
        previewWindow?.close()
      }
      await onClosed()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={appModalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(appModalPanelClass, 'max-w-lg')}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-zinc-700 dark:text-zinc-300" strokeWidth={1.75} />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Cerrar caja</h2>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/40">
            <div>
              <p className="text-xs text-zinc-500">Ingresos</p>
              <p className="font-semibold tabular-nums">{money(summary?.totalIngresos || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Egresos</p>
              <p className="font-semibold tabular-nums">{money(summary?.totalEgresos || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Fondo inicial</p>
              <p className="font-semibold tabular-nums">{money(session.openingCash)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Efectivo esperado</p>
              <p className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {money(expected)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Efectivo contado en caja</Label>
            <input
              type="text"
              inputMode="numeric"
              value={countedCash ? counted.toLocaleString('es-CO') : ''}
              onChange={(e) => setCountedCash(e.target.value.replace(/[^\d]/g, ''))}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-lg font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
            />
            <div
              className={cn(
                'rounded-lg border px-3 py-2 text-sm',
                diff === 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
              )}
            >
              Diferencia: <span className="font-bold tabular-nums">{money(diff)}</span>
              {diff === 0 ? ' · Cuadra perfecto' : diff > 0 ? ' · Sobra' : ' · Falta'}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Nota de cierre <span className="font-normal text-zinc-500">(opcional)</span>
            </Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-zinc-900 text-white hover:bg-zinc-800"
            onClick={() => void handleSubmit()}
            disabled={saving}
          >
            {saving ? 'Cerrando y enviando…' : 'Confirmar cierre'}
          </Button>
        </div>
      </div>
    </div>
  )
}

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
    setCountedCash(String(Math.round(live?.expectedCash ?? 0)))
    setNotes('')
    setSummary(live)
    void CashSessionsService.computeLiveSummary(session).then(setSummary)
  }, [isOpen, session, live])

  if (!isOpen) return null

  const counted = parseInt(countedCash.replace(/[^\d]/g, ''), 10) || 0
  const expected = summary?.expectedCash ?? 0
  const diff = counted - expected

  const notifyWhatsApp = async (sessionId: string, previewWindows: Window[]) => {
    const closePreviews = () => {
      for (const w of previewWindows) {
        try {
          w.close()
        } catch {
          /* ignore */
        }
      }
    }

    try {
      const res = await fetch('/api/caja/notify-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        closePreviews()
        toast.message('Caja cerrada', {
          description: 'No se pudo preparar el WhatsApp del informe.',
        })
        return
      }

      const phonesLabel =
        typeof data.phonesLabel === 'string' && data.phonesLabel
          ? data.phonesLabel
          : '+57 320 5689053, +57 315 2802343'

      if (data.sent) {
        closePreviews()
        toast.success(`Informe enviado por WhatsApp a ${phonesLabel}`)
        return
      }

      const urls: string[] = Array.isArray(data.whatsappUrls)
        ? data.whatsappUrls.filter((u: unknown): u is string => typeof u === 'string')
        : data.whatsappUrl
          ? [data.whatsappUrl]
          : []

      if (urls.length > 0) {
        urls.forEach((url, index) => {
          const win = previewWindows[index]
          if (win) {
            win.location.href = url
          } else {
            window.open(url, '_blank', 'noopener,noreferrer')
          }
        })
        // Cerrar ventanas de más si sobran
        for (let i = urls.length; i < previewWindows.length; i++) {
          try {
            previewWindows[i].close()
          } catch {
            /* ignore */
          }
        }
        toast.success('Caja cerrada', {
          description: `WhatsApp listo para ${phonesLabel}. Confirma Enviar en cada chat.`,
        })
        return
      }

      closePreviews()
      toast.success('Caja cerrada')
    } catch {
      closePreviews()
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
    // Abrir ya las pestañas (gesto del usuario) para Efrain y copia de prueba
    const previewWindows = [
      window.open('about:blank', '_blank'),
      window.open('about:blank', '_blank'),
    ].filter((w): w is Window => Boolean(w))
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
        for (const w of previewWindows) w.close()
        toast.error(result.error || 'No se pudo cerrar')
        return
      }
      if (result.session?.id) {
        await notifyWhatsApp(result.session.id, previewWindows)
      } else {
        for (const w of previewWindows) w.close()
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
              <p className="text-xs text-zinc-500">Fondo inicial (no se suma)</p>
              <p className="font-semibold tabular-nums">{money(session.openingCash)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Efectivo esperado (sin base)</p>
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

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { X, Lock, AlertTriangle, Eye } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  CashSessionsService,
  type CashCloseBlocker,
} from '@/lib/cash-sessions-service'
import type { CashSession, CashSessionLiveSummary } from '@/types'
import { appModalOverlayClass, appModalPanelClass } from '@/lib/app-modal'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CloseCashModalProps {
  isOpen: boolean
  session: CashSession
  live: CashSessionLiveSummary | null
  onClose: () => void
  onClosed: (sessionId: string) => void | Promise<void>
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
  /** Conteo ciego: no revelar esperado hasta que digiten lo contado y verifiquen. */
  const [revealed, setRevealed] = useState(false)
  const [blockers, setBlockers] = useState<CashCloseBlocker[]>([])
  const [loadingBlockers, setLoadingBlockers] = useState(false)
  const [cuentaAck, setCuentaAck] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setCountedCash('')
    setNotes('')
    setRevealed(false)
    setSummary(live)
    setBlockers([])
    setCuentaAck(false)
    setLoadingBlockers(true)
    void CashSessionsService.computeLiveSummary(session).then(setSummary)
    void CashSessionsService.findCloseBlockers(session)
      .then(setBlockers)
      .catch(() => {
        toast.error('No se pudo validar facturas del turno')
        setBlockers([])
      })
      .finally(() => setLoadingBlockers(false))
  }, [isOpen, session, live])

  if (!isOpen) return null

  const hasCountedInput = countedCash.trim() !== ''
  const counted = hasCountedInput ? parseInt(countedCash.replace(/[^\d]/g, ''), 10) || 0 : 0
  const expected = summary?.expectedCash ?? 0
  const diff = counted - expected
  const hasBlockers = blockers.length > 0
  const notesRequired = revealed && diff !== 0
  const notesOk = !notesRequired || notes.trim().length >= 15
  const hasCuentaEgresos = (summary?.egresosCuentaCount || 0) > 0
  const cuentaOk = !hasCuentaEgresos || cuentaAck
  const canConfirm =
    !hasBlockers &&
    !loadingBlockers &&
    revealed &&
    hasCountedInput &&
    notesOk &&
    cuentaOk &&
    !saving

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

  const handleReveal = () => {
    if (!hasCountedInput) {
      toast.error('Cuenta el efectivo físico e ingresa el monto primero.')
      return
    }
    setRevealed(true)
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Sesión no válida. Cierra sesión e inicia de nuevo.')
      return
    }
    if (hasBlockers) {
      toast.error('Corrige o anula las facturas listadas antes de cerrar.')
      return
    }
    if (!revealed || !hasCountedInput) {
      toast.error('Primero cuenta el efectivo y verifica el conteo.')
      return
    }
    if (!notesOk) {
      toast.error('Con diferencia debes explicar el sobrante o faltante (mín. 15 caracteres).')
      return
    }
    if (hasCuentaEgresos && !cuentaAck) {
      toast.error('Confirma que las mensualidades de este turno no salieron de la gaveta.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/caja/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          countedCash: counted,
          notes,
          userId: user.id,
          userName: user.name,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.session?.id) {
        if (Array.isArray(data?.blockers) && data.blockers.length > 0) {
          setBlockers(data.blockers)
        }
        toast.error(
          typeof data?.error === 'string' ? data.error : 'No se pudo cerrar la caja'
        )
        return
      }

      const previewWindows = [
        window.open('about:blank', '_blank'),
        window.open('about:blank', '_blank'),
      ].filter((w): w is Window => Boolean(w))

      await notifyWhatsApp(data.session.id, previewWindows)
      await onClosed(data.session.id)
    } catch (error) {
      console.error('close cash:', error)
      toast.error(
        error instanceof Error ? error.message : 'Error inesperado al cerrar la caja'
      )
    } finally {
      setSaving(false)
    }
  }

  const emptyBlockers = blockers.filter((b) => b.kind === 'empty_items')
  const draftBlockers = blockers.filter((b) => b.kind === 'draft')

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
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          {(hasBlockers || loadingBlockers) && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/50 dark:bg-red-950/30">
              <div className="mb-2 flex items-center gap-2 font-semibold text-red-800 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {loadingBlockers
                  ? 'Validando facturas del turno…'
                  : 'No puedes cerrar hasta corregir esto'}
              </div>
              {!loadingBlockers && (
                <div className="space-y-2 text-red-800 dark:text-red-200">
                  {emptyBlockers.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide">
                        Ventas sin productos ({emptyBlockers.length})
                      </p>
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {emptyBlockers.map((b) => (
                          <li key={b.id}>
                            <Link
                              href={`/sales/${b.id}`}
                              className="font-medium underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {b.invoiceNumber}
                            </Link>
                            {' · '}
                            {b.clientName} · {money(b.total)} — anúlala o completa los ítems
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {draftBlockers.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide">
                        Borradores abiertos ({draftBlockers.length})
                      </p>
                      <ul className="mt-1 list-inside list-disc text-xs">
                        {draftBlockers.map((b) => (
                          <li key={b.id}>
                            <Link
                              href={`/sales/new?draft=${b.id}`}
                              className="font-medium underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {b.invoiceNumber || 'Borrador'}
                            </Link>
                            {' · '}
                            {b.clientName || 'Sin cliente'} — factúralo o elimínalo
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
              <p className="text-xs text-zinc-500">Fondo inicial (sí cuenta)</p>
              <p className="font-semibold tabular-nums">{money(session.openingCash)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Efectivo esperado (con fondo)</p>
              {revealed ? (
                <p className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                  {money(expected)}
                </p>
              ) : (
                <p className="text-sm font-medium text-zinc-400">••••••</p>
              )}
            </div>
          </div>

          {hasCuentaEgresos && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-semibold">
                {summary?.egresosCuentaCount} egreso
                {summary?.egresosCuentaCount === 1 ? '' : 's'} de cuenta en este turno:{' '}
                {money(summary?.egresosCuentaAmount || 0)}
              </p>
              <p className="mt-1 text-xs opacity-90">
                No salen de la gaveta ni bajan el efectivo esperado. Si alguno se pagó en efectivo,
                corrígelo a «Caja del turno» en{' '}
                <Link href="/egresos?tipo=cuenta" className="font-semibold underline">
                  Egresos
                </Link>{' '}
                antes de cerrar.
              </p>
              <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  checked={cuentaAck}
                  onChange={(e) => setCuentaAck(e.target.checked)}
                />
                <span>
                  Confirmo que esas mensualidades no salieron de la gaveta de hoy.
                </span>
              </label>
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950/40">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Abonos de créditos (turno)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-zinc-500">En efectivo</p>
                <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {money(summary?.creditAbonosCash || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Otros medios</p>
                <p className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {money(summary?.creditAbonosOther || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <Label className="text-indigo-950 dark:text-indigo-100">
              1. Cuenta todo el efectivo de la gaveta
            </Label>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
              Sin mirar el esperado. Incluye el fondo inicial: es el dinero que hay físico en caja.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={hasCountedInput ? counted.toLocaleString('es-CO') : ''}
              onChange={(e) => {
                setCountedCash(e.target.value.replace(/[^\d]/g, ''))
                setRevealed(false)
              }}
              onFocus={(e) => e.target.select()}
              placeholder="Escribe lo que contaste…"
              disabled={hasBlockers}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-lg font-semibold tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
            />
            {!revealed ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleReveal}
                disabled={!hasCountedInput || hasBlockers || loadingBlockers}
              >
                <Eye className="h-4 w-4" />
                2. Verificar conteo (revelar esperado)
              </Button>
            ) : (
              <div className="space-y-2">
                <div
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm',
                    diff === 0
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
                  )}
                >
                  Esperado: <span className="font-bold tabular-nums">{money(expected)}</span>
                  {' · '}
                  Diferencia: <span className="font-bold tabular-nums">{money(diff)}</span>
                  {diff === 0 ? ' · Cuadra' : diff > 0 ? ' · Sobra' : ' · Falta'}
                </div>
                {expected === 0 && counted === 0 && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    El sistema no esperaba efectivo en este turno (fondo + ventas − egresos = 0).
                    Si contaste $0, puedes cerrar.
                  </p>
                )}
                {expected === 0 && counted > 0 && (
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    El sistema esperaba $0 en efectivo y tú contaste {money(counted)}. Explica de
                    dónde salió ese dinero en la nota.
                  </p>
                )}
                {(summary?.usedFromOpening || 0) > 0 && (
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Los egresos en efectivo superaron las ventas en efectivo. Se usaron{' '}
                    {money(summary?.usedFromOpening || 0)} del fondo inicial. Cuenta también lo
                    que quede de ese fondo.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Nota de cierre{' '}
              {notesRequired ? (
                <span className="font-normal text-amber-700 dark:text-amber-400">(obligatoria)</span>
              ) : (
                <span className="font-normal text-zinc-500">(opcional)</span>
              )}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={
                notesRequired
                  ? 'Explica el sobrante o faltante…'
                  : 'Observaciones del cierre…'
              }
              disabled={!revealed && !hasBlockers}
            />
            {notesRequired && notes.trim().length < 15 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Mínimo 15 caracteres ({notes.trim().length}/15)
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
          <Button type="button" variant="destructive" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canConfirm}>
            {saving ? 'Cerrando y enviando…' : 'Confirmar cierre'}
          </Button>
        </div>
      </div>
    </div>
  )
}

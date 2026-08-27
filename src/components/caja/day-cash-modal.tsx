'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Lock,
  Wallet,
  X,
} from 'lucide-react'
import type { CashSession, CashSessionLiveSummary } from '@/types'
import {
  CashSessionsService,
  type CashCloseBlocker,
  type TodaySalesBeforeOpen,
} from '@/lib/cash-sessions-service'
import {
  appModalBodyClass,
  appModalFooterClass,
  appModalHeaderClass,
  appModalOverlayClass,
  appModalPanelClass,
} from '@/lib/app-modal'
import { cn } from '@/lib/utils'
import { formatDateTimeCo } from '@/lib/cash-close-whatsapp'
import { toast } from 'sonner'

function money(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)
}

interface DayCashModalProps {
  isOpen: boolean
  session: CashSession
  live: CashSessionLiveSummary | null
  fromPreviousDay: boolean
  canClose: boolean
  closing?: boolean
  onClose: () => void
  onRequestCloseCash: () => void
  onSessionUpdated?: (session: CashSession, live: CashSessionLiveSummary) => void
}

/**
 * Modal único al entrar a Caja con turno abierto: siempre "Caja del día"
 * (hoy o turno de ayer: el mismo). Cerrar caja cierra el turno de inmediato.
 */
export function DayCashModal({
  isOpen,
  session,
  live,
  fromPreviousDay,
  canClose,
  closing = false,
  onClose,
  onRequestCloseCash,
  onSessionUpdated,
}: DayCashModalProps) {
  const [blockers, setBlockers] = useState<CashCloseBlocker[]>([])
  const [loadingBlockers, setLoadingBlockers] = useState(false)
  const [pendingToday, setPendingToday] = useState<TodaySalesBeforeOpen | null>(null)
  const [loadingPendingToday, setLoadingPendingToday] = useState(false)
  const [includingToday, setIncludingToday] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setBlockers([])
    setLoadingBlockers(true)
    void CashSessionsService.findCloseBlockers(session)
      .then(setBlockers)
      .catch(() => {
        toast.error('No se pudo validar facturas del turno')
        setBlockers([])
      })
      .finally(() => setLoadingBlockers(false))
  }, [isOpen, session.id, session.openedAt, session.closedAt, session.storeId])

  useEffect(() => {
    if (!isOpen || session.status !== 'open') {
      setPendingToday(null)
      return
    }
    setLoadingPendingToday(true)
    void fetch(`/api/caja/include-today-sales?storeId=${encodeURIComponent(session.storeId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo consultar ventas del día')
        return res.json() as Promise<{ pending: TodaySalesBeforeOpen | null }>
      })
      .then((data) => setPendingToday(data.pending))
      .catch(() => setPendingToday(null))
      .finally(() => setLoadingPendingToday(false))
  }, [isOpen, session.id, session.openedAt, session.status, session.storeId])

  const handleIncludeTodaySales = async () => {
    if (includingToday || closing || !pendingToday?.canInclude) return
    setIncludingToday(true)
    try {
      const res = await fetch('/api/caja/include-today-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, storeId: session.storeId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudieron incluir las ventas de hoy')
      }
      toast.success(
        `Se incluyeron ${data.salesIncluded} venta(s) de hoy en este turno de caja.`
      )
      setPendingToday(null)
      onSessionUpdated?.(data.session as CashSession, data.live as CashSessionLiveSummary)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron incluir las ventas')
    } finally {
      setIncludingToday(false)
    }
  }

  if (!isOpen) return null

  const hasBlockers = blockers.length > 0
  const emptyBlockers = blockers.filter((b) => b.kind === 'empty_items')
  const draftBlockers = blockers.filter((b) => b.kind === 'draft')
  const closeDisabled = closing || loadingBlockers || hasBlockers

  return (
    <div
      className={appModalOverlayClass}
      role="presentation"
      onClick={() => {
        if (!closing) onClose()
      }}
    >
      <div
        className={cn(appModalPanelClass, 'max-w-5xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-cash-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={appModalHeaderClass}>
          <div className="min-w-0">
            <h2
              id="day-cash-modal-title"
              className="truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Caja del día
            </h2>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              Turno abierto · {formatDateTimeCo(session.openedAt)} · {session.openedByName}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-md p-0"
            onClick={onClose}
            disabled={closing}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        <div className={appModalBodyClass}>
          <div className="space-y-4">
            {fromPreviousDay && (
              <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    Este turno se abrió ayer
                  </p>
                  <p className="mt-0.5 text-sm text-amber-900/90 dark:text-amber-200/90">
                    Es la misma caja del día: revisa el resumen y cierra cuando estés lista.
                  </p>
                </div>
              </div>
            )}

            {!fromPreviousDay && pendingToday?.canInclude && (
              <div className="flex flex-col gap-3 rounded-xl border border-sky-300 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-sky-800 dark:bg-sky-950/40">
                <div className="min-w-0">
                  <p className="font-semibold text-sky-950 dark:text-sky-100">
                    Hay {pendingToday.salesCount} venta(s) de hoy fuera de este turno
                  </p>
                  <p className="mt-0.5 text-sm text-sky-900/90 dark:text-sky-200/90">
                    Se facturaron antes de abrir caja ({money(pendingToday.salesTotal)}). Inclúyelas
                    para que entren en el cierre de hoy.
                  </p>
                  {pendingToday.invoiceNumbers.length > 0 && (
                    <p className="mt-1 truncate text-xs text-sky-800/80 dark:text-sky-300/80">
                      {pendingToday.invoiceNumbers.slice(0, 8).join(', ')}
                      {pendingToday.invoiceNumbers.length > 8 ? '…' : ''}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-sky-400 bg-white text-sky-950 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100 dark:hover:bg-sky-900"
                  disabled={includingToday || closing || loadingPendingToday}
                  onClick={() => void handleIncludeTodaySales()}
                >
                  {includingToday ? 'Incluyendo…' : 'Incluir facturas de hoy'}
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                Caja abierta
              </Badge>
              <span className="text-sm text-zinc-500">
                Desde {formatDateTimeCo(session.openedAt)} · {session.openedByName}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile icon={Banknote} label="Fondo inicial" value={money(session.openingCash)} tone="neutral" />
              <SummaryTile
                icon={ArrowUpCircle}
                label="Ingresos del turno"
                value={money(live?.totalIngresos || 0)}
                tone="income"
              />
              <SummaryTile
                icon={ArrowDownCircle}
                label="Egresos del turno"
                value={money(live?.totalEgresos || 0)}
                tone="expense"
              />
              <SummaryTile
                icon={Wallet}
                label="Efectivo esperado"
                value={money(live?.expectedCash || 0)}
                tone="cash"
              />
            </div>

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

            {live && (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                        Entra dinero
                      </p>
                      <p className="text-sm font-bold tabular-nums text-emerald-900 dark:text-emerald-200">
                        {money(live.totalIngresos)}
                      </p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Efectivo</p>
                        <Line label="Ventas en efectivo" value={money(live.salesCash)} />
                        <Line label="Abonos de crédito" value={money(live.creditAbonosCash)} />
                      </div>
                      <div className="border-t border-emerald-200/70 pt-3 dark:border-emerald-900/40">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                          Digital / tarjeta
                        </p>
                        <div className="space-y-1.5">
                          <Line label="Nequi" value={money(live.salesNequi)} />
                          <Line label="Bancolombia" value={money(live.salesBancolombia)} />
                          <Line label="Transferencia" value={money(live.salesTransfer)} />
                          <Line label="Tarjeta" value={money(live.salesCard)} />
                          <Line label="Abonos crédito (otros medios)" value={money(live.creditAbonosOther)} />
                        </div>
                      </div>
                      <div className="border-t border-emerald-200/70 pt-3 dark:border-emerald-900/40">
                        <Line label="Ventas cobradas" value={`${live.salesCount}`} muted />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-rose-800 dark:text-rose-300">
                        Sale dinero
                      </p>
                      <p className="text-sm font-bold tabular-nums text-rose-900 dark:text-rose-200">
                        {money(live.totalEgresos)}
                      </p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Por medio</p>
                        <Line label="En efectivo" value={money(live.egresosCash)} />
                        <Line label="Otros medios" value={money(live.egresosOther)} />
                      </div>
                      {(live.egresosCuentaCount || 0) > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                          <p className="font-semibold">
                            {live.egresosCuentaCount} egreso
                            {live.egresosCuentaCount === 1 ? '' : 's'} de cuenta · {money(live.egresosCuentaAmount)}
                          </p>
                          <p className="mt-0.5 opacity-90">
                            No salen de esta gaveta ni entran al cierre. Si pagaste en efectivo, cámbialos a
                            «Caja del turno» en{' '}
                            <Link href="/egresos?tipo=cuenta" className="font-semibold underline">
                              Egresos
                            </Link>
                            .
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(live.salesCredit || 0) > 0 && (
                  <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                        Facturado a crédito (aparte)
                      </p>
                      <p className="text-sm font-bold tabular-nums text-sky-900 dark:text-sky-200">
                        {money(live.salesCredit)}
                      </p>
                    </div>
                    <p className="text-xs text-sky-900/80 dark:text-sky-200/80">
                      No suma a ingresos ni al efectivo esperado. Solo se cuentan los abonos cuando el cliente paga.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={appModalFooterClass}>
          <Button type="button" variant="outline" onClick={onClose} disabled={closing}>
            Ver historial
          </Button>
          {canClose && (
            <Button type="button" onClick={onRequestCloseCash} disabled={closeDisabled}>
              <Lock className="h-3.5 w-3.5" />
              {closing ? 'Cerrando…' : 'Cerrar caja'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet
  label: string
  value: string
  tone: 'neutral' | 'income' | 'expense' | 'cash'
}) {
  const tones = {
    neutral: 'text-zinc-600 dark:text-zinc-400',
    income: 'text-emerald-600 dark:text-emerald-400',
    expense: 'text-rose-600 dark:text-rose-400',
    cash: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <Icon className={cn('h-4 w-4', tones[tone])} strokeWidth={1.75} />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  )
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={cn('text-zinc-600 dark:text-zinc-400', muted && 'text-zinc-500')}>{label}</span>
      <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
  )
}

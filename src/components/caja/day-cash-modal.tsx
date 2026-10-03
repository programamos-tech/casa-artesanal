'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, X } from 'lucide-react'
import type { CashSession, CashSessionLiveSummary } from '@/types'
import {
  CashSessionsService,
  type CashCloseBlocker,
  type TodaySalesBeforeOpen,
} from '@/lib/cash-sessions-service'
import {
  modalBodyClass,
  modalCloseButtonClass,
  modalFooterClass,
  modalHeaderClass,
  modalOverlayClass,
  modalPanelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSubtitleClass,
  modalTitleClass,
} from '@/lib/app-modal'
import { StatusDot } from '@/components/dashboard/report-ui'
import { CashKpi, CashLine, CashLineGroup, CashNote, CashSectionTitle, cashKpiRowClass, cashMoney } from './cash-ui'
import { cn } from '@/lib/utils'
import { formatDateTimeCo } from '@/lib/cash-close-whatsapp'
import { toast } from 'sonner'

const money = cashMoney

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
      className={modalOverlayClass}
      role="presentation"
      onClick={() => {
        if (!closing) onClose()
      }}
    >
      <div
        className={cn(modalPanelClass, 'max-w-4xl')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-cash-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={modalHeaderClass}>
          <div className="min-w-0">
            <h2 id="day-cash-modal-title" className={modalTitleClass}>
              Caja del día
            </h2>
            <p className={cn(modalSubtitleClass, 'flex items-center gap-1.5')}>
              <StatusDot tone={fromPreviousDay ? 'warning' : 'success'} />
              <span className="truncate">
                Abierta · {formatDateTimeCo(session.openedAt)} · {session.openedByName}
              </span>
            </p>
          </div>
          <button
            type="button"
            className={modalCloseButtonClass}
            onClick={onClose}
            disabled={closing}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className={modalBodyClass}>
          <div className="space-y-5">
            {fromPreviousDay && (
              <CashNote tone="warning" title="Este turno se abrió ayer">
                Es la misma caja del día: revisa el resumen y cierra cuando estés lista.
              </CashNote>
            )}

            {!fromPreviousDay && pendingToday?.canInclude && (
              <CashNote
                tone="warning"
                title={`Hay ${pendingToday.salesCount} venta(s) de hoy fuera de este turno`}
                action={
                  <button
                    type="button"
                    className={modalSecondaryButtonClass}
                    disabled={includingToday || closing || loadingPendingToday}
                    onClick={() => void handleIncludeTodaySales()}
                  >
                    {includingToday ? 'Incluyendo…' : 'Incluir facturas de hoy'}
                  </button>
                }
              >
                <p>
                  Se facturaron antes de abrir caja ({money(pendingToday.salesTotal)}). Inclúyelas para que entren
                  en el cierre de hoy.
                </p>
                {pendingToday.invoiceNumbers.length > 0 && (
                  <p className="mt-1 truncate font-mono text-xs text-zinc-400 dark:text-white/40">
                    {pendingToday.invoiceNumbers.slice(0, 8).join(', ')}
                    {pendingToday.invoiceNumbers.length > 8 ? '…' : ''}
                  </p>
                )}
              </CashNote>
            )}

            <div className={cashKpiRowClass}>
              <CashKpi label="Fondo inicial" value={money(session.openingCash)} tone="muted" hint="No entra al cierre" />
              <CashKpi label="Ingresos del turno" value={money(live?.totalIngresos || 0)} tone="income" />
              <CashKpi label="Egresos del turno" value={money(live?.totalEgresos || 0)} tone="expense" />
              <CashKpi label="Efectivo esperado" value={money(live?.expectedCash || 0)} hint="Sin fondo inicial" />
            </div>

            {(hasBlockers || loadingBlockers) && (
              <CashNote
                tone={loadingBlockers ? 'info' : 'danger'}
                title={loadingBlockers ? 'Validando facturas del turno…' : 'No puedes cerrar hasta corregir esto'}
              >
                {!loadingBlockers && (
                  <div className="mt-1 space-y-2">
                    {emptyBlockers.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-700 dark:text-white/75">
                          Ventas sin productos ({emptyBlockers.length})
                        </p>
                        <ul className="mt-0.5 space-y-0.5 text-xs">
                          {emptyBlockers.map((b) => (
                            <li key={b.id}>
                              <Link
                                href={`/sales/${b.id}`}
                                className="font-mono font-medium text-zinc-900 underline underline-offset-2 dark:text-white"
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
                        <p className="text-xs font-medium text-zinc-700 dark:text-white/75">
                          Borradores abiertos ({draftBlockers.length})
                        </p>
                        <ul className="mt-0.5 space-y-0.5 text-xs">
                          {draftBlockers.map((b) => (
                            <li key={b.id}>
                              <Link
                                href={`/sales/new?draft=${b.id}`}
                                className="font-mono font-medium text-zinc-900 underline underline-offset-2 dark:text-white"
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
              </CashNote>
            )}

            {live && (
              <>
                <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
                  <section>
                    <CashSectionTitle aside={money(live.totalIngresos)}>Entra dinero</CashSectionTitle>
                    <CashLineGroup title="Efectivo">
                      <CashLine label="Ventas en efectivo" value={money(live.salesCash)} />
                      <CashLine label="Abonos de crédito" value={money(live.creditAbonosCash)} />
                    </CashLineGroup>
                    <CashLineGroup title="Digital / tarjeta">
                      <CashLine label="Nequi" value={money(live.salesNequi)} />
                      <CashLine label="Bancolombia" value={money(live.salesBancolombia)} />
                      <CashLine label="Transferencia" value={money(live.salesTransfer)} />
                      <CashLine label="Tarjeta" value={money(live.salesCard)} />
                      <CashLine label="Abonos de crédito (otros medios)" value={money(live.creditAbonosOther)} />
                    </CashLineGroup>
                    <CashLineGroup>
                      <CashLine label="Ventas cobradas" value={`${live.salesCount}`} muted />
                    </CashLineGroup>
                  </section>

                  <section>
                    <CashSectionTitle aside={money(live.totalEgresos)}>Sale dinero</CashSectionTitle>
                    <CashLineGroup title="Por medio">
                      <CashLine label="En efectivo" value={money(live.egresosCash)} />
                      <CashLine label="Otros medios" value={money(live.egresosOther)} />
                    </CashLineGroup>
                    {(live.egresosCuentaCount || 0) > 0 && (
                      <CashNote
                        tone="warning"
                        className="mt-3"
                        title={`${live.egresosCuentaCount} egreso${live.egresosCuentaCount === 1 ? '' : 's'} de cuenta · ${money(live.egresosCuentaAmount)}`}
                      >
                        No salen de esta gaveta ni entran al cierre. Si pagaste en efectivo, cámbialos a «Caja del
                        turno» en{' '}
                        <Link
                          href="/egresos?tipo=cuenta"
                          className="font-medium text-zinc-900 underline underline-offset-2 dark:text-white"
                        >
                          Egresos
                        </Link>
                        .
                      </CashNote>
                    )}
                  </section>
                </div>

                {(live.salesCredit || 0) > 0 && (
                  <CashNote title={`Facturado a crédito (aparte) · ${money(live.salesCredit)}`}>
                    No suma a ingresos ni al efectivo esperado. Solo se cuentan los abonos cuando el cliente paga.
                  </CashNote>
                )}
              </>
            )}
          </div>
        </div>

        <div className={modalFooterClass}>
          <button type="button" className={modalSecondaryButtonClass} onClick={onClose} disabled={closing}>
            Ver historial
          </button>
          {canClose && (
            <button
              type="button"
              className={modalPrimaryButtonClass}
              onClick={onRequestCloseCash}
              disabled={closeDisabled}
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
              {closing ? 'Cerrando…' : 'Cerrar caja'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

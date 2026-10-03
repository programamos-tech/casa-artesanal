'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { useAuth } from '@/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'
import {
  CashSessionsService,
  cashSessionDifferenceTone,
  getCashRegisterStoreId,
  getCashSessionDifferenceView,
  isCashSessionFromPreviousDay,
} from '@/lib/cash-sessions-service'
import type { CashSession, CashSessionLiveSummary } from '@/types'
import { OpenCashModal } from '@/components/caja/open-cash-modal'
import { DayCashModal } from '@/components/caja/day-cash-modal'
import { toast } from 'sonner'
import { Eye, LockOpen, RefreshCw, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusDot } from '@/components/dashboard/report-ui'
import { formatDateTimeCo } from '@/lib/cash-close-whatsapp'
import {
  closeCashCloseWhatsAppPreviews,
  notifyCashCloseWhatsApp,
  openCashCloseWhatsAppPreviews,
} from '@/lib/notify-cash-close'

const detailActionClass =
  'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium leading-none transition-colors disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0'

const detailGhostClass = cn(
  detailActionClass,
  'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white'
)

const detailPrimaryClass = cn(
  detailActionClass,
  'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'
)

const headerIconBtnClass =
  'flex h-8 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-white/45 dark:hover:text-white'

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'

const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

function formatDateCo(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' })
}

function formatTimeCo(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })
}

function sessionShiftLabel(s: CashSession) {
  const sameDay = formatDateCo(s.openedAt) === formatDateCo(s.closedAt)
  return `${formatTimeCo(s.openedAt)} → ${sameDay ? formatTimeCo(s.closedAt) : formatDateTimeCo(s.closedAt)}`
}

function sessionPeopleLabel(s: CashSession) {
  const opened = s.openedByName || '—'
  const closed = s.closedByName || '—'
  return opened === closed ? opened : `${opened} → ${closed}`
}

function money(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export default function CajaPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { canCreate, canCancel, canEdit } = usePermissions()
  const canEgresos = canCreate('egresos') || canEdit('egresos')
  const [openSession, setOpenSession] = useState<CashSession | null>(null)
  const [history, setHistory] = useState<CashSession[]>([])
  const [live, setLive] = useState<CashSessionLiveSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [dayModal, setDayModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const storeId = getCashRegisterStoreId()
  const dayModalAutoOpenedRef = useRef<string | null>(null)

  const canOpen = canCreate('cash_register')
  // Vendedoras/cajeras: deben poder cerrar siempre que operen caja (create/edit/cancel).
  const canClose =
    canCreate('cash_register') ||
    canCancel('cash_register') ||
    canEdit('cash_register')
  const closedSessions = history.filter((s) => s.status === 'closed')
  const sessionFromPreviousDay = Boolean(
    openSession && isCashSessionFromPreviousDay(openSession.openedAt)
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [open, sessions] = await Promise.all([
        CashSessionsService.getOpenSession(storeId),
        CashSessionsService.getSessions({ storeId, limit: 20 }),
      ])
      setOpenSession(open)
      setHistory(sessions)
      if (open) {
        const summary = await CashSessionsService.computeLiveSummary(open)
        setLive(summary)
      } else {
        setLive(null)
        setDayModal(false)
      }
    } catch {
      toast.error('No se pudo cargar la caja')
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    void load()
  }, [load, user?.storeId])

  // Siempre el mismo modal al entrar: "Caja del día" (hoy o turno de ayer da igual).
  useEffect(() => {
    if (!openSession || loading) return
    if (dayModalAutoOpenedRef.current === openSession.id) return
    dayModalAutoOpenedRef.current = openSession.id
    setDayModal(true)
  }, [openSession, loading])

  const handleCloseCash = useCallback(async () => {
    if (!openSession || closing) return
    if (!user?.id) {
      toast.error('Sesión no válida. Cierra sesión e inicia de nuevo.')
      return
    }

    setClosing(true)
    const previewWindows = openCashCloseWhatsAppPreviews()
    try {
      const res = await fetch('/api/caja/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: openSession.id,
          useExpectedCash: true,
          userId: user.id,
          userName: user.name,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.session?.id) {
        closeCashCloseWhatsAppPreviews(previewWindows)
        toast.error(
          typeof data?.error === 'string' ? data.error : 'No se pudo cerrar la caja'
        )
        return
      }

      await notifyCashCloseWhatsApp(data.session.id, previewWindows)
      setDayModal(false)
      router.push(`/caja/${data.session.id}`)
    } catch (error) {
      closeCashCloseWhatsAppPreviews(previewWindows)
      console.error('close cash:', error)
      toast.error(
        error instanceof Error ? error.message : 'Error inesperado al cerrar la caja'
      )
    } finally {
      setClosing(false)
    }
  }, [openSession, closing, user?.id, user?.name, router])

  return (
    <RoleProtectedRoute module="cash_register" requiredAction="view">
      <div className="py-4 max-xl:pb-1 md:py-6">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-white/[0.07] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">Caja</h1>
            <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">Turno del día e historial de cierres.</p>
            {!loading ? (
              <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 text-[13px] text-zinc-700 dark:text-white/80">
                <StatusDot tone={openSession ? (sessionFromPreviousDay ? 'warning' : 'success') : 'neutral'} />
                {openSession ? (
                  <>
                    {sessionFromPreviousDay ? 'Caja abierta desde ayer' : 'Caja abierta'}
                    <span className="text-zinc-400 dark:text-white/40">
                      · {formatDateTimeCo(openSession.openedAt)} · {openSession.openedByName}
                    </span>
                  </>
                ) : (
                  'Caja cerrada'
                )}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className={headerIconBtnClass}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} strokeWidth={1.5} />
            </button>
            {canEgresos && (
              <Link href="/egresos?tipo=caja&nuevo=1" className={detailGhostClass}>
                <Wallet strokeWidth={1.75} />
                Egreso de caja
              </Link>
            )}
            {openSession && (
              <button type="button" onClick={() => setDayModal(true)} className={detailPrimaryClass}>
                <Eye strokeWidth={1.75} />
                Ver caja del día
              </button>
            )}
            {!openSession && canOpen && (
              <button type="button" onClick={() => setOpenModal(true)} className={detailPrimaryClass}>
                <LockOpen strokeWidth={1.75} />
                Abrir caja
              </button>
            )}
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-[13px] font-semibold text-zinc-900 dark:text-white">Historial de cierres</h2>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
              <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando caja…</p>
            </div>
          ) : closedSessions.length === 0 ? (
            <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Aún no hay cierres registrados</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Cuando cierres el primer turno aparecerá aquí.
              </p>
            </div>
          ) : (
            <>
              <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
                {closedSessions.map((s) => {
                  const diffView = getCashSessionDifferenceView(s)
                  return (
                    <Link
                      key={s.id}
                      href={`/caja/${s.id}`}
                      className="casa-artesanal-preserve-surface flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {formatDateCo(s.openedAt)}
                          <span className="ml-1.5 text-xs font-normal tabular-nums text-zinc-500 dark:text-zinc-400">
                            {sessionShiftLabel(s)}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          Ingresos {money(s.totalIngresos)} · Egresos {money(s.totalEgresos)}
                        </p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs">
                          <span className="text-zinc-500 dark:text-zinc-400">Esperado {money(s.expectedCash)}</span>
                          <span className="text-zinc-300 dark:text-white/20">·</span>
                          <span className={cn('font-medium tabular-nums', cashSessionDifferenceTone(diffView.kind))}>
                            {diffView.label} {money(diffView.amount)}
                          </span>
                        </p>
                      </div>
                      <Eye className="mt-1 h-4 w-4 shrink-0 text-zinc-400 dark:text-white/40" strokeWidth={1.5} />
                    </Link>
                  )
                })}
              </div>

              <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
                <table className="w-full min-w-[820px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                      <th className={thClass}>Turno</th>
                      <th className={cn(thClass, 'text-right')}>Fondo</th>
                      <th className={cn(thClass, 'text-right')}>Ingresos</th>
                      <th className={cn(thClass, 'text-right')}>Egresos</th>
                      <th className={cn(thClass, 'text-right')}>Esperado</th>
                      <th className={cn(thClass, 'text-right')}>Contado</th>
                      <th className={cn(thClass, 'text-right')}>Diferencia</th>
                      <th className="w-12 px-2 py-2.5">
                        <span className="sr-only">Detalle</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedSessions.map((s) => {
                      const diffView = getCashSessionDifferenceView(s)
                      return (
                        <tr
                          key={s.id}
                          className="casa-artesanal-preserve-surface cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                          onClick={() => router.push(`/caja/${s.id}`)}
                        >
                          <td className={cn(tdClass, 'whitespace-nowrap')}>
                            <p className="font-medium text-zinc-900 dark:text-zinc-50">{formatDateCo(s.openedAt)}</p>
                            <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                              {sessionShiftLabel(s)} · {sessionPeopleLabel(s)}
                            </p>
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums text-zinc-500 dark:text-zinc-400')}>
                            {money(s.openingCash)}
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>{money(s.totalIngresos)}</td>
                          <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>{money(s.totalEgresos)}</td>
                          <td className={cn(tdClass, 'whitespace-nowrap text-right font-medium tabular-nums')}>
                            {money(s.expectedCash)}
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap text-right tabular-nums')}>
                            {s.countedCash ? money(s.countedCash) : <span className="text-zinc-400">—</span>}
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap text-right')}>
                            <span className={cn('font-medium tabular-nums', cashSessionDifferenceTone(diffView.kind))}>
                              {money(diffView.amount)}
                            </span>
                            <span className="block text-xs text-zinc-500 dark:text-zinc-400">{diffView.label}</span>
                          </td>
                          <td className="px-3 py-1.5">
                            <Link
                              href={`/caja/${s.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={rowIconBtnClass}
                              title="Ver detalle"
                              aria-label="Ver detalle del cierre"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <OpenCashModal
          isOpen={openModal}
          onClose={() => setOpenModal(false)}
          onOpened={async () => {
            setOpenModal(false)
            toast.success('Caja abierta')
            dayModalAutoOpenedRef.current = null
            await load()
          }}
        />

        {openSession && (
          <DayCashModal
            isOpen={dayModal}
            session={openSession}
            live={live}
            fromPreviousDay={sessionFromPreviousDay}
            canClose={canClose}
            closing={closing}
            onClose={() => setDayModal(false)}
            onRequestCloseCash={() => void handleCloseCash()}
            onSessionUpdated={(session, summary) => {
              setOpenSession(session)
              setLive(summary)
            }}
          />
        )}
      </div>
    </RoleProtectedRoute>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { StoreBadge } from '@/components/ui/store-badge'
import { cardShell } from '@/lib/card-shell'
import { formatDateTimeCo } from '@/lib/cash-close-whatsapp'
import {
  closeCashCloseWhatsAppPreviews,
  notifyCashCloseWhatsApp,
  openCashCloseWhatsAppPreviews,
} from '@/lib/notify-cash-close'

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
      <div className="min-h-screen space-y-4 bg-white py-4 dark:bg-neutral-950 md:space-y-6 md:py-6">
        <Card className={cn(cardShell)}>
          <CardHeader className="flex flex-col gap-3 border-b border-zinc-200/80 p-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between md:p-6">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                Caja
                <StoreBadge />
              </CardTitle>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Historial de cierres. La caja del día se abre en un modal encima de la tabla.
              </p>
              {openSession && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Caja abierta
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    Desde {formatDateTimeCo(openSession.openedAt)} · {openSession.openedByName}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                Actualizar
              </Button>
              {canEgresos && (
                <Link
                  href="/egresos?tipo=caja&nuevo=1"
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-semibold text-zinc-800 shadow-none hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Egreso de caja
                </Link>
              )}
              {openSession && (
                <Button type="button" variant="outline" size="sm" onClick={() => setDayModal(true)}>
                  <Eye className="h-3.5 w-3.5" />
                  Ver caja del día
                </Button>
              )}
              {!openSession && canOpen && (
                <Button type="button" size="sm" onClick={() => setOpenModal(true)}>
                  <LockOpen className="h-3.5 w-3.5" />
                  Abrir caja
                </Button>
              )}
              {/* Cerrar solo desde el modal "Caja del día" */}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 md:px-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Historial de cierres
              </h3>
            </div>
            {loading ? (
              <p className="p-4 text-sm text-zinc-500 md:p-6">Cargando…</p>
            ) : closedSessions.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500 md:p-6">Aún no hay cierres registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/80 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <th className="px-4 py-3">Apertura</th>
                      <th className="px-3 py-3">Cierre</th>
                      <th className="px-3 py-3">Fondo</th>
                      <th className="px-3 py-3">Ingresos</th>
                      <th className="px-3 py-3">Egresos</th>
                      <th className="px-3 py-3">Esperado</th>
                      <th className="px-3 py-3">Contado</th>
                      <th className="px-3 py-3">Diferencia</th>
                      <th className="px-3 py-3 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {closedSessions.map((s) => {
                      const diffView = getCashSessionDifferenceView(s)
                      return (
                        <tr
                          key={s.id}
                          className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-900/40"
                          onClick={() => router.push(`/caja/${s.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div>{formatDateTimeCo(s.openedAt)}</div>
                            <div className="text-xs text-zinc-500">{s.openedByName}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div>{formatDateTimeCo(s.closedAt)}</div>
                            <div className="text-xs text-zinc-500">{s.closedByName || '—'}</div>
                          </td>
                          <td className="px-3 py-3 tabular-nums">{money(s.openingCash)}</td>
                          <td className="px-3 py-3 tabular-nums">{money(s.totalIngresos)}</td>
                          <td className="px-3 py-3 tabular-nums">{money(s.totalEgresos)}</td>
                          <td className="px-3 py-3 tabular-nums">{money(s.expectedCash)}</td>
                          <td className="px-3 py-3 tabular-nums">{money(s.countedCash || 0)}</td>
                          <td
                            className={cn(
                              'px-3 py-3 font-medium tabular-nums',
                              cashSessionDifferenceTone(diffView.kind)
                            )}
                          >
                            {money(diffView.amount)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Link
                              href={`/caja/${s.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                              aria-label="Ver detalle del cierre"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.75} />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

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

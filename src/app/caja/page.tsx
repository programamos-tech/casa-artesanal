'use client'

import { useCallback, useEffect, useState } from 'react'
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
  getCashRegisterStoreId,
} from '@/lib/cash-sessions-service'
import type { CashSession, CashSessionLiveSummary } from '@/types'
import { OpenCashModal } from '@/components/caja/open-cash-modal'
import { CloseCashModal } from '@/components/caja/close-cash-modal'
import { toast } from 'sonner'
import {
  Banknote,
  Eye,
  Lock,
  LockOpen,
  RefreshCw,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StoreBadge } from '@/components/ui/store-badge'
import { cardShell } from '@/lib/card-shell'
import { formatDateTimeCo } from '@/lib/cash-close-whatsapp'

function money(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)
}

const formatDateTime = formatDateTimeCo

export default function CajaPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { canCreate, canCancel } = usePermissions()
  const [openSession, setOpenSession] = useState<CashSession | null>(null)
  const [history, setHistory] = useState<CashSession[]>([])
  const [live, setLive] = useState<CashSessionLiveSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [closeModal, setCloseModal] = useState(false)
  const storeId = getCashRegisterStoreId()

  const canOpen = canCreate('cash_register')
  const canClose = canCancel('cash_register') || canCreate('cash_register')
  const closedSessions = history.filter((s) => s.status === 'closed')

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
                Opcional: abre con un dinero base y al cierre ves ingresos y egresos del turno.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                Actualizar
              </Button>
              {!openSession && canOpen && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-700 text-white hover:bg-emerald-800"
                  onClick={() => setOpenModal(true)}
                >
                  <LockOpen className="h-3.5 w-3.5" />
                  Abrir caja
                </Button>
              )}
              {openSession && canClose && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                  onClick={() => setCloseModal(true)}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Cerrar caja
                </Button>
              )}
            </div>
          </CardHeader>
          {loading ? (
            <CardContent className="p-4 md:p-6">
              <p className="text-sm text-zinc-500">Cargando…</p>
            </CardContent>
          ) : openSession ? (
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Caja abierta
                </Badge>
                <span className="text-sm text-zinc-500">
                  Desde {formatDateTime(openSession.openedAt)} · {openSession.openedByName}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryTile
                  icon={Banknote}
                  label="Fondo inicial"
                  value={money(openSession.openingCash)}
                  tone="neutral"
                />
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
                  label="Efectivo esperado (sin base)"
                  value={money(live?.expectedCash ?? 0)}
                  tone="cash"
                />
              </div>
              {live && (
                <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Desglose ingresos</p>
                    <Line label="Ventas efectivo" value={money(live.salesCash)} />
                    <Line label="Nequi" value={money(live.salesNequi)} />
                    <Line label="Bancolombia" value={money(live.salesBancolombia)} />
                    <Line label="Transferencia" value={money(live.salesTransfer)} />
                    <Line label="Tarjeta" value={money(live.salesCard)} />
                    <Line label="Crédito (facturado)" value={money(live.salesCredit)} />
                    <Line label="Abonos crédito (efectivo)" value={money(live.creditAbonosCash)} />
                    <Line label="Abonos crédito (otros)" value={money(live.creditAbonosOther)} />
                    <Line label="Ventas" value={`${live.salesCount}`} muted />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Desglose egresos</p>
                    <Line label="Egresos en efectivo" value={money(live.egresosCash)} />
                    <Line label="Egresos otros medios" value={money(live.egresosOther)} />
                    <Line label="Cantidad de egresos" value={`${live.egresosCount}`} muted />
                    <p className="pt-3 text-xs text-zinc-500">
                      Efectivo esperado = fondo + ventas/abonos en efectivo − egresos en efectivo.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          ) : null}
        </Card>

        <Card className={cn(cardShell)}>
          <CardHeader className="border-b border-zinc-200/80 p-4 dark:border-zinc-800 md:px-6">
            <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Historial de cierres
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {closedSessions.length === 0 ? (
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
                    {closedSessions.map((s) => (
                      <tr
                        key={s.id}
                        className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-900/40"
                        onClick={() => router.push(`/caja/${s.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div>{formatDateTime(s.openedAt)}</div>
                          <div className="text-xs text-zinc-500">{s.openedByName}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div>{formatDateTime(s.closedAt)}</div>
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
                            (s.difference || 0) === 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : (s.difference || 0) > 0
                                ? 'text-sky-700 dark:text-sky-400'
                                : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {money(s.difference || 0)}
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
                    ))}
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
            await load()
          }}
        />
        {openSession && (
          <CloseCashModal
            isOpen={closeModal}
            session={openSession}
            live={live}
            onClose={() => setCloseModal(false)}
            onClosed={async () => {
              setCloseModal(false)
              await load()
            }}
          />
        )}
      </div>
    </RoleProtectedRoute>
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

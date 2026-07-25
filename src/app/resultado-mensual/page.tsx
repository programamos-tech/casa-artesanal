'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StoreBadge } from '@/components/ui/store-badge'
import { useAuth } from '@/contexts/auth-context'
import { cardShell } from '@/lib/card-shell'
import { getCurrentUserStoreId } from '@/lib/store-helper'
import {
  currentYearMonth,
  MonthlyResultService,
  type MonthlyResult,
} from '@/lib/monthly-result-service'
import { cn } from '@/lib/utils'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  PiggyBank,
  RefreshCw,
  Scale,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function money(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0)
}

function Line({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn('text-sm', muted ? 'text-zinc-500' : 'text-zinc-700 dark:text-zinc-300')}>
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums text-sm font-semibold',
          muted ? 'text-zinc-500' : 'text-zinc-900 dark:text-zinc-50'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export default function ResultadoMensualPage() {
  const { user } = useAuth()
  const now = useMemo(() => currentYearMonth(), [])
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<MonthlyResult | null>(null)

  const years = useMemo(() => {
    const y = now.year
    return [y, y - 1, y - 2]
  }, [now.year])

  const storeId = getCurrentUserStoreId() || undefined

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await MonthlyResultService.getMonthlyResult({
        year,
        month,
        storeId,
      })
      setResult(data)
    } catch (e) {
      console.error(e)
      toast.error('No se pudo cargar el resultado del mes')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [year, month, storeId])

  useEffect(() => {
    void load()
  }, [load, user?.storeId])

  const channelsWithMovement = (result?.channels || []).filter(
    (c) => c.inAmount > 0 || c.outAmount > 0
  )

  return (
    <RoleProtectedRoute module="egresos" requiredAction="view">
      <div className="min-h-screen space-y-4 bg-white py-4 dark:bg-neutral-950 md:space-y-6 md:py-6">
        <Card className={cn(cardShell)}>
          <CardHeader className="flex flex-col gap-3 border-b border-zinc-200/80 p-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between md:p-6">
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Scale className="h-5 w-5 text-teal-600 dark:text-teal-400" strokeWidth={1.5} />
                Resultado del mes
                <StoreBadge />
              </CardTitle>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Cuánto entró, cuánto salió y con cuánto queda el negocio en el mes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={name} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-9 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                Actualizar
              </Button>
              <Link
                href="/egresos?tipo=cuenta&nuevo=1"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 text-sm font-semibold text-zinc-800 shadow-none hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Egreso de cuenta
              </Link>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4 md:p-6">
            {loading ? (
              <p className="text-sm text-zinc-500">Calculando {MONTH_NAMES[month - 1]} {year}…</p>
            ) : !result ? (
              <p className="text-sm text-zinc-500">Sin datos para este mes.</p>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {MONTH_NAMES[month - 1]} {year}
                  <span className="font-normal text-zinc-500">
                    {' '}
                    · {result.fromDate} → {result.toDate}
                  </span>
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <SummaryTile
                    icon={ArrowUpCircle}
                    label="Entró en el mes"
                    value={money(result.totalIn)}
                    tone="income"
                    hint={`${result.salesCount} ventas cobradas · ${result.abonosCount} abonos`}
                  />
                  <SummaryTile
                    icon={ArrowDownCircle}
                    label="Salió en el mes"
                    value={money(result.totalOut)}
                    tone="expense"
                    hint={`${result.egresosCount} egresos`}
                  />
                  <SummaryTile
                    icon={PiggyBank}
                    label="Quedó el negocio"
                    value={money(result.netAmount)}
                    tone={result.netAmount >= 0 ? 'net-pos' : 'net-neg'}
                    hint="Entró − salió (sin ventas a crédito)"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                      Desglose de lo que entró
                    </p>
                    <div className="space-y-1.5 text-sm">
                      <Line label="Ventas cobradas" value={money(result.salesIn)} />
                      <Line label="Abonos de créditos" value={money(result.abonosIn)} />
                      <div className="border-t border-emerald-200/70 pt-2 dark:border-emerald-900/40">
                        <Line label="Total entró" value={money(result.totalIn)} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rose-800 dark:text-rose-300">
                      Desglose de lo que salió
                    </p>
                    <div className="space-y-1.5 text-sm">
                      <Line label="Egresos de caja (turno)" value={money(result.egresosCajaOut)} />
                      <Line label="Egresos de cuenta (mensual)" value={money(result.egresosCuentaOut)} />
                      <div className="border-t border-rose-200/70 pt-2 dark:border-rose-900/40">
                        <Line label="Total salió" value={money(result.totalOut)} />
                      </div>
                    </div>
                  </div>
                </div>

                {result.salesCredit > 0 && (
                  <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
                          Facturado a crédito (aparte)
                        </p>
                        <p className="mt-1 text-xs text-sky-900/80 dark:text-sky-200/80">
                          No suma a “entró”. Solo cuenta cuando el cliente abona.
                        </p>
                      </div>
                      <p className="text-lg font-bold tabular-nums text-sky-900 dark:text-sky-100">
                        {money(result.salesCredit)}
                      </p>
                    </div>
                  </div>
                )}

                <div className={cn(cardShell, 'overflow-hidden')}>
                  <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Por canal / cuenta
                    </p>
                    <p className="text-xs text-zinc-500">
                      Así ves si en Transferencia, Nequi, Bancolombia o efectivo alcanzó la plata del mes.
                    </p>
                  </div>
                  {channelsWithMovement.length === 0 ? (
                    <p className="p-4 text-sm text-zinc-500">Sin movimientos en este mes.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50/80 text-left text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
                            <th className="px-4 py-3">Canal</th>
                            <th className="px-3 py-3 text-right">Entró</th>
                            <th className="px-3 py-3 text-right">Salió</th>
                            <th className="px-4 py-3 text-right">Quedó</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                          {channelsWithMovement.map((c) => (
                            <tr key={c.channel}>
                              <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                                {c.label}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                                {money(c.inAmount)}
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-rose-700 dark:text-rose-300">
                                {money(c.outAmount)}
                              </td>
                              <td
                                className={cn(
                                  'px-4 py-3 text-right font-semibold tabular-nums',
                                  c.netAmount >= 0
                                    ? 'text-teal-800 dark:text-teal-300'
                                    : 'text-rose-700 dark:text-rose-300'
                                )}
                              >
                                {money(c.netAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40">
                            <td className="px-4 py-3 font-bold text-zinc-900 dark:text-zinc-50">Total</td>
                            <td className="px-3 py-3 text-right font-bold tabular-nums">
                              {money(result.totalIn)}
                            </td>
                            <td className="px-3 py-3 text-right font-bold tabular-nums">
                              {money(result.totalOut)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums">
                              {money(result.netAmount)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleProtectedRoute>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof ArrowUpCircle
  label: string
  value: string
  tone: 'income' | 'expense' | 'net-pos' | 'net-neg'
  hint?: string
}) {
  const tones = {
    income:
      'border-emerald-200/80 bg-emerald-50/50 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-100',
    expense:
      'border-rose-200/80 bg-rose-50/50 text-rose-950 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-100',
    'net-pos':
      'border-teal-200/80 bg-teal-50/60 text-teal-950 dark:border-teal-900/40 dark:bg-teal-950/30 dark:text-teal-100',
    'net-neg':
      'border-amber-200/80 bg-amber-50/60 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100',
  }
  return (
    <div className={cn('rounded-xl border p-4', tones[tone])}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 opacity-80" strokeWidth={1.75} />
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-75">{hint}</p> : null}
    </div>
  )
}

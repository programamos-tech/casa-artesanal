'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import type { Sale, Store, User } from '@/types'
import { AuthService } from '@/lib/auth-service'
import { SalesService } from '@/lib/sales-service'
import { StoresService } from '@/lib/stores-service'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/ui/user-avatar'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import { PaymentMethodLabel } from '@/components/sales/payment-method-label'
import { REPORT_CHART_COLORS, ReportBarChart } from '@/components/dashboard/report-bar-chart'
import { moduleOptions, roleOptions } from '@/components/roles/user-management'

type Period = 'today' | 'week' | 'month' | 'all'

const ITEMS_PER_PAGE = 20

const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'

const detailGhostClass =
  'casa-artesanal-preserve-surface inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[13px] font-medium leading-none text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-white/[0.12] dark:text-white/80 dark:hover:bg-white/[0.06] dark:hover:text-white [&_svg]:size-3.5 [&_svg]:shrink-0'

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const pageBtnClass =
  'casa-artesanal-preserve-surface flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs tabular-nums transition-colors disabled:pointer-events-none disabled:opacity-40'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'

const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

const metaSepClass = 'text-zinc-300 dark:text-white/20'

const periodOptions: { value: Period; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'all', label: 'Todo' },
]

const saleStatusLabel: Record<Sale['status'], string> = {
  completed: 'Completada',
  pending: 'Pendiente',
  draft: 'Borrador',
  cancelled: 'Anulada',
}

const saleStatusTone: Record<Sale['status'], ReportTone> = {
  completed: 'success',
  pending: 'warning',
  draft: 'neutral',
  cancelled: 'danger',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })
}

function getPeriodStart(period: Period): Date | null {
  const now = new Date()
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week') {
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff)
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  return null
}

const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function buildSalesChart(sales: Sale[], period: Period) {
  const now = new Date()
  const buckets: { key: string; label: string }[] = []
  let keyOf: (d: Date) => string

  if (period === 'today') {
    const hours = sales.map((s) => new Date(s.createdAt).getHours())
    const from = Math.min(8, ...hours)
    const to = Math.max(Math.min(now.getHours(), 20), ...hours)
    for (let h = from; h <= to; h++) buckets.push({ key: String(h), label: `${h}h` })
    keyOf = (d) => String(d.getHours())
  } else if (period === 'week') {
    const start = getPeriodStart('week') as Date
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      buckets.push({ key: d.toDateString(), label: weekdayLabels[i] })
    }
    keyOf = (d) => d.toDateString()
  } else if (period === 'month') {
    for (let day = 1; day <= now.getDate(); day++) {
      const d = new Date(now.getFullYear(), now.getMonth(), day)
      buckets.push({ key: d.toDateString(), label: String(day) })
    }
    keyOf = (d) => d.toDateString()
  } else {
    const first = sales.reduce((min, s) => {
      const d = new Date(s.createdAt)
      return d < min ? d : min
    }, now)
    const cursor = new Date(first.getFullYear(), first.getMonth(), 1)
    while (cursor <= now) {
      const month = cursor.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')
      const label = `${month} ${String(cursor.getFullYear()).slice(2)}`
      buckets.push({ key: `${cursor.getFullYear()}-${cursor.getMonth()}`, label })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}`
  }

  const totals = new Map<string, number>()
  for (const s of sales) {
    const k = keyOf(new Date(s.createdAt))
    totals.set(k, (totals.get(k) || 0) + (s.total || 0))
  }
  return buckets.map((b) => ({ label: b.label, total: totals.get(b.key) || 0 }))
}

function moduleAccessLabels(user: User) {
  const raw = Array.isArray(user.permissions) ? user.permissions : []
  const enabled = new Set(
    raw
      .filter((p) => {
        const actions = (p?.actions || (p as { permissions?: string[] })?.permissions || []) as string[]
        return p?.module && actions.length > 0
      })
      .map((p) => p.module)
  )
  return moduleOptions.filter((m) => enabled.has(m.value)).map((m) => m.label)
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-zinc-500 dark:text-white/50">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-400 dark:text-white/40">{hint}</p> : null}
    </div>
  )
}

type UserDetailViewProps = {
  userId: string
  variant?: 'admin' | 'self'
  actions?: ReactNode
  extra?: ReactNode
}

export function UserDetailView({ userId, variant = 'admin', actions, extra }: UserDetailViewProps) {
  const isSelf = variant === 'self'
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [period, setPeriod] = useState<Period>('all')
  const [page, setPage] = useState(1)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const [u, s] = await Promise.all([
          AuthService.getUserById(userId),
          SalesService.getSalesBySeller(userId),
        ])
        if (cancelled) return
        if (!u) {
          setNotFound(true)
          return
        }
        setUser(u)
        setSales(s)
        const storeRow = await StoresService.getStoreById(u.storeId || MAIN_STORE_ID).catch(() => null)
        if (!cancelled) setStore(storeRow)
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    setPage(1)
  }, [period])

  const filteredSales = useMemo(() => {
    const start = getPeriodStart(period)
    if (!start) return sales
    return sales.filter((s) => new Date(s.createdAt) >= start)
  }, [sales, period])

  const completed = useMemo(() => filteredSales.filter((s) => s.status === 'completed'), [filteredSales])
  const totalRevenue = completed.reduce((acc, s) => acc + (s.total || 0), 0)
  const ticketAvg = completed.length > 0 ? totalRevenue / completed.length : 0
  const cancelledCount = filteredSales.filter((s) => s.status === 'cancelled').length
  const chartData = useMemo(() => buildSalesChart(completed, period), [completed, period])

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const pageSales = filteredSales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
        <p className="text-[13px] text-zinc-500 dark:text-white/50">Cargando usuario…</p>
      </div>
    )
  }

  if (notFound || !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Usuario no encontrado</p>
        {isSelf ? actions : (
          <Link href="/roles" className={detailGhostClass}>
            <ArrowLeft strokeWidth={1.75} />
            Volver a Roles
          </Link>
        )}
      </div>
    )
  }

  const roleLabel = roleOptions.find((r) => r.value === user.role)?.label || user.role
  const modules = moduleAccessLabels(user)

  return (
    <div className="py-4 max-xl:pb-1 md:py-6">
      <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <UserAvatar name={user.name} seed={user.id} size="lg" className="shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">
              {user.name}
            </h1>
            <p className="mt-0.5 truncate text-[13px] text-zinc-500 dark:text-white/50">{user.email || '—'}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-zinc-600 dark:text-white/70">
              <span className="inline-flex items-center gap-1.5">
                <StatusDot tone={user.isActive ? 'success' : 'neutral'} />
                {user.isActive ? 'Activo' : 'Inactivo'}
              </span>
              <span className={metaSepClass}>·</span>
              <span className="font-medium text-zinc-900 dark:text-white">{roleLabel}</span>
              <span className={metaSepClass}>·</span>
              <span>{store?.name || 'Tienda principal'}</span>
              <span className={metaSepClass}>·</span>
              <span>Último acceso {user.lastLogin ? formatDateTime(user.lastLogin) : 'nunca'}</span>
              {user.createdAt ? (
                <>
                  <span className={metaSepClass}>·</span>
                  <span>Creado {formatDate(user.createdAt)}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        {isSelf ? (
          actions ? <div className="flex shrink-0 items-center justify-end gap-1.5">{actions}</div> : null
        ) : (
          <button type="button" onClick={() => router.push('/roles')} className={cn(detailGhostClass, 'self-end sm:self-auto')}>
            <ArrowLeft strokeWidth={1.75} />
            Volver
          </button>
        )}
      </div>

      <section className="mt-5">
        <h2 className="mb-1.5 text-[13px] font-semibold text-zinc-900 dark:text-white">Permisos</h2>
        {user.role === 'superadmin' ? (
          <p className="text-[13px] text-zinc-600 dark:text-white/70">Acceso completo</p>
        ) : modules.length === 0 ? (
          <p className="text-[13px] text-zinc-400 dark:text-white/40">Sin módulos asignados</p>
        ) : (
          <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-white/70">{modules.join(' · ')}</p>
        )}
      </section>

      {extra}

      {isSelf && sales.length === 0 ? null : (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">Ventas</h2>
            <div
              role="tablist"
              aria-label="Período"
              className="casa-artesanal-preserve-surface inline-grid grid-cols-4 gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/[0.06]"
            >
              {periodOptions.map((opt) => {
                const active = period === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setPeriod(opt.value)}
                    className={cn(
                      'casa-artesanal-preserve-surface rounded-md border px-3 py-1 text-[13px] transition-colors',
                      active
                        ? 'border-zinc-200 bg-white font-semibold text-zinc-900 shadow-sm dark:border-white/[0.12] dark:bg-[#0a0a0b] dark:text-white'
                        : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-white/55 dark:hover:text-white'
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:grid-cols-4">
            <Kpi label="Total vendido" value={formatCurrency(totalRevenue)} />
            <Kpi label="Facturas" value={String(completed.length)} />
            <Kpi label="Ticket promedio" value={formatCurrency(ticketAvg)} />
            <Kpi label="Anuladas" value={String(cancelledCount)} />
          </div>

          {sales.length > 0 ? (
            <div className="border-b border-zinc-200 py-4 dark:border-white/[0.07]">
              <ReportBarChart
                data={chartData}
                categoryKey="label"
                series={[{ key: 'total', name: 'Vendido', color: REPORT_CHART_COLORS.primary }]}
                isDarkMode={isDarkMode}
                height={220}
              />
            </div>
          ) : null}

          <div className="mt-4">
            {filteredSales.length === 0 ? (
              <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin ventas en este período.</p>
              </div>
            ) : (
              <>
                <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
                  {pageSales.map((s) => (
                    <Link
                      key={s.id}
                      href={`/sales/${s.id}`}
                      className="casa-artesanal-preserve-surface flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{s.clientName}</p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-mono">{s.invoiceNumber || s.id.slice(0, 8)}</span> ·{' '}
                          {formatDateTime(s.createdAt)}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-xs">
                          <PaymentMethodLabel method={s.paymentMethod} />
                          <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                            <StatusDot tone={saleStatusTone[s.status]} />
                            {saleStatusLabel[s.status]}
                          </span>
                        </p>
                      </div>
                      <p
                        className={cn(
                          'shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50',
                          s.status === 'cancelled' && 'text-zinc-400 line-through dark:text-zinc-500'
                        )}
                      >
                        {formatCurrency(s.total)}
                      </p>
                    </Link>
                  ))}
                </div>

                <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
                  <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                        <th className={thClass}>Factura</th>
                        <th className={thClass}>Cliente</th>
                        <th className={thClass}>Fecha</th>
                        <th className={thClass}>Método</th>
                        <th className={thClass}>Estado</th>
                        <th className={cn(thClass, 'text-right')}>Total</th>
                        <th className="w-12 px-2 py-2.5">
                          <span className="sr-only">Ver</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageSales.map((s) => (
                        <tr
                          key={s.id}
                          onClick={() => router.push(`/sales/${s.id}`)}
                          className="casa-artesanal-preserve-surface cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                        >
                          <td className={cn(tdClass, 'whitespace-nowrap font-mono text-[13px]')}>
                            {s.invoiceNumber || s.id.slice(0, 8)}
                          </td>
                          <td className={cn(tdClass, 'max-w-[16rem]')}>
                            <span className="block truncate font-medium text-zinc-900 dark:text-zinc-50">{s.clientName}</span>
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-300')}>
                            {formatDateTime(s.createdAt)}
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap')}>
                            <PaymentMethodLabel method={s.paymentMethod} />
                          </td>
                          <td className={cn(tdClass, 'whitespace-nowrap')}>
                            <span className="inline-flex items-center gap-1.5 text-[13px]">
                              <StatusDot tone={saleStatusTone[s.status]} />
                              {saleStatusLabel[s.status]}
                            </span>
                          </td>
                          <td
                            className={cn(
                              tdClass,
                              'whitespace-nowrap text-right font-semibold tabular-nums',
                              s.status === 'cancelled' && 'text-zinc-400 line-through dark:text-zinc-500'
                            )}
                          >
                            {formatCurrency(s.total)}
                          </td>
                          <td className="px-2 py-1.5">
                            <Link
                              href={`/sales/${s.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className={rowIconBtnClass}
                              title="Ver factura"
                              aria-label={`Ver factura ${s.invoiceNumber || ''}`}
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-white/50">
                    <span>
                      Página {currentPage} de {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className={cn(pageBtnClass, 'text-zinc-500 hover:text-zinc-900 dark:text-white/50 dark:hover:text-white')}
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className={cn(pageBtnClass, 'text-zinc-500 hover:text-zinc-900 dark:text-white/50 dark:hover:text-white')}
                        aria-label="Página siguiente"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

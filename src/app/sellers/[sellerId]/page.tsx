'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User as UserIcon,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Receipt,
  Mail,
  Calendar,
  Store as StoreIcon,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/ui/user-avatar'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { Sale, User } from '@/types'
import { AuthService } from '@/lib/auth-service'
import { SalesService } from '@/lib/sales-service'
import { cardShell } from '@/lib/card-shell'
import { cn } from '@/lib/utils'

type Period = 'today' | 'week' | 'month' | 'all'

const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '$ 0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDateTime = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const paymentLabel: Record<Sale['paymentMethod'], string> = {
  cash: 'Efectivo',
  credit: 'Crédito',
  transfer: 'Transferencia',
  nequi: 'Nequi',
  bancolombia: 'Bancolombia',
  warranty: 'Garantía',
  mixed: 'Mixto',
  card: 'Tarjeta',
}

const statusLabel: Record<Sale['status'], string> = {
  completed: 'Completada',
  pending: 'Pendiente',
  draft: 'Borrador',
  cancelled: 'Anulada',
}

const statusBadgeClass = (status: Sale['status']) => {
  switch (status) {
    case 'completed':
      return 'border-brand-500/25 bg-brand-500/10 text-brand-900 dark:border-brand-500/30 dark:bg-brand-950/40 dark:text-brand-300'
    case 'pending':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300'
    case 'draft':
      return 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
    case 'cancelled':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-900 dark:border-rose-500/35 dark:bg-rose-950/40 dark:text-rose-300'
    default:
      return 'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
}

function getPeriodStart(period: Period): Date | null {
  const now = new Date()
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  }
  if (period === 'week') {
    // Lunes como inicio de semana (domingo = 0 → 6 días atrás)
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0)
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  }
  return null
}

export default function SellerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sellerId = (params?.sellerId as string) || ''

  const [seller, setSeller] = useState<User | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [period, setPeriod] = useState<Period>('all')

  useEffect(() => {
    if (!sellerId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const [u, s] = await Promise.all([
          AuthService.getUserById(sellerId),
          SalesService.getSalesBySeller(sellerId),
        ])
        if (cancelled) return
        if (!u) {
          setNotFound(true)
          setSeller(null)
          setSales([])
        } else {
          setSeller(u)
          setSales(s)
        }
      } catch {
        if (!cancelled) {
          setNotFound(true)
          setSeller(null)
          setSales([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [sellerId])

  const filteredSales = useMemo(() => {
    const start = getPeriodStart(period)
    if (!start) return sales
    return sales.filter((s) => new Date(s.createdAt) >= start)
  }, [sales, period])

  const completed = useMemo(
    () => filteredSales.filter((s) => s.status === 'completed'),
    [filteredSales]
  )

  const totalRevenue = useMemo(
    () => completed.reduce((acc, s) => acc + (s.total || 0), 0),
    [completed]
  )
  const ticketAvg = completed.length > 0 ? totalRevenue / completed.length : 0

  const cancelledCount = useMemo(
    () => filteredSales.filter((s) => s.status === 'cancelled').length,
    [filteredSales]
  )

  const periodOptions: { value: Period; label: string }[] = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'all', label: 'Todo' },
  ]

  if (loading) {
    return (
      <RoleProtectedRoute module="roles" requiredAction="view">
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 py-24 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando vendedor…</p>
        </div>
      </RoleProtectedRoute>
    )
  }

  if (notFound || !seller) {
    return (
      <RoleProtectedRoute module="roles" requiredAction="view">
        <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 px-4 py-16 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
          <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">Vendedor no encontrado</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              El usuario no existe, fue eliminado o no tienes acceso.
            </p>
            <button
              type="button"
              onClick={() => router.push('/roles')}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-zinc-900 px-6 text-base font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Volver a Roles
            </button>
          </div>
        </div>
      </RoleProtectedRoute>
    )
  }

  return (
    <RoleProtectedRoute module="roles" requiredAction="view">
      <div className="min-h-screen bg-gradient-to-b from-zinc-50/90 via-white to-zinc-50/80 pb-12 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-3 px-4 py-4 md:px-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push('/roles')}
              className="-ml-2 shrink-0"
              aria-label="Volver a Roles"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </Button>
            <UserIcon className="h-6 w-6 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                Detalle del vendedor
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ventas atribuidas a {seller.name}.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
          {/* Bloque de identidad */}
          <Card className={cn(cardShell, 'mb-6')}>
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6 md:p-6">
              <UserAvatar
                name={seller.name}
                seed={seller.id}
                size="xl"
                className="shrink-0 ring-1 ring-zinc-200/80 dark:ring-zinc-700"
              />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold text-zinc-900 dark:text-zinc-50 md:text-2xl">
                    {seller.name}
                  </h2>
                  <Badge
                    variant="outline"
                    className={cn(
                      seller.isActive
                        ? 'border-brand-500/30 bg-brand-500/10 text-brand-800 dark:text-brand-300'
                        : 'border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400'
                    )}
                  >
                    {seller.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <Badge variant="outline" className="border-zinc-300/90 text-zinc-700 dark:border-zinc-600 dark:text-zinc-200">
                    {seller.role.charAt(0).toUpperCase() + seller.role.slice(1)}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {seller.email && (
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{seller.email}</span>
                    </span>
                  )}
                  {seller.storeId && (
                    <span className="inline-flex items-center gap-1.5">
                      <StoreIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                      <span className="font-mono text-[11px]">{seller.storeId.slice(0, 8)}…</span>
                    </span>
                  )}
                  {seller.createdAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                      <span>Creado {formatDateTime(seller.createdAt).split(',')[0]}</span>
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtros de período */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Período
            </span>
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/40">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    period === opt.value
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Métricas */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricTile
              icon={<DollarSign className="h-4 w-4" strokeWidth={1.5} />}
              label="Total vendido"
              value={formatCurrency(totalRevenue)}
              hint={`${completed.length} ventas completadas`}
            />
            <MetricTile
              icon={<ShoppingCart className="h-4 w-4" strokeWidth={1.5} />}
              label="N° de facturas"
              value={completed.length.toString()}
              hint={
                cancelledCount > 0
                  ? `${cancelledCount} anulada${cancelledCount === 1 ? '' : 's'}`
                  : 'Sin anuladas'
              }
            />
            <MetricTile
              icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
              label="Ticket promedio"
              value={formatCurrency(ticketAvg)}
              hint="Por factura completada"
            />
            <MetricTile
              icon={<Receipt className="h-4 w-4" strokeWidth={1.5} />}
              label="Facturas en período"
              value={filteredSales.length.toString()}
              hint="Incluye todos los estados"
            />
          </div>

          {/* Lista de ventas */}
          <Card className={cardShell}>
            <CardHeader className="space-y-0 border-b border-zinc-200/80 p-4 dark:border-zinc-800 md:p-5">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                <Receipt className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-300" strokeWidth={1.5} />
                Ventas atribuidas
              </CardTitle>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Lista completa de facturas asignadas a este vendedor en el período.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSales.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Receipt className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No hay ventas atribuidas en este período.
                  </p>
                </div>
              ) : (
                <>
                  {/* Vista móvil: tarjetas */}
                  <div className="divide-y divide-zinc-200/80 md:hidden dark:divide-zinc-800">
                    {filteredSales.map((s) => (
                      <Link
                        key={s.id}
                        href={`/sales/${s.id}`}
                        className="block px-4 py-3 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                {s.invoiceNumber || s.id.slice(0, 6)}
                              </span>
                              <Badge variant="outline" className={cn('text-[10px]', statusBadgeClass(s.status))}>
                                {statusLabel[s.status]}
                              </Badge>
                            </div>
                            <p className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {s.clientName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                              {formatDateTime(s.createdAt)} • {paymentLabel[s.paymentMethod] || s.paymentMethod}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatCurrency(s.total)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Vista desktop: tabla */}
                  <div className="hidden md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200/80 bg-zinc-50/60 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                          <th className="px-5 py-3">Factura</th>
                          <th className="px-5 py-3">Cliente</th>
                          <th className="px-5 py-3">Fecha</th>
                          <th className="px-5 py-3">Pago</th>
                          <th className="px-5 py-3">Estado</th>
                          <th className="px-5 py-3 text-right">Total</th>
                          <th className="px-5 py-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                        {filteredSales.map((s) => (
                          <tr key={s.id} className="transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                            <td className="px-5 py-3 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              {s.invoiceNumber || s.id.slice(0, 8)}
                            </td>
                            <td className="px-5 py-3 text-zinc-900 dark:text-zinc-100">
                              <span className="line-clamp-1">{s.clientName}</span>
                            </td>
                            <td className="px-5 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                              {formatDateTime(s.createdAt)}
                            </td>
                            <td className="px-5 py-3 text-xs text-zinc-700 dark:text-zinc-300">
                              {paymentLabel[s.paymentMethod] || s.paymentMethod}
                            </td>
                            <td className="px-5 py-3">
                              <Badge variant="outline" className={cn('text-[10px]', statusBadgeClass(s.status))}>
                                {statusLabel[s.status]}
                              </Badge>
                            </td>
                            <td className="px-5 py-3 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                              {formatCurrency(s.total)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <Link
                                href={`/sales/${s.id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                                Ver
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleProtectedRoute>
  )
}

function MetricTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
        <span className="text-zinc-500 dark:text-zinc-300">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50 md:text-xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </div>
  )
}

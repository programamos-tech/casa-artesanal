'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  ArrowRightLeft,
  ShoppingCart,
  Package,
  Users,
  Tag,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  Shield,
  Eye,
  ChevronDown,
  ChevronRight,
  CreditCard,
  CheckCircle,
  DollarSign,
  X,
  Receipt,
  TrendingUp,
  Activity
} from 'lucide-react'
import type { LogEntry } from '@/lib/logs-service'
import { StoreBadge } from '@/components/ui/store-badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import {
  resolveLogType,
  labelForLogType,
  getModuleBadgeLabel,
  getLogActionLabel,
  getLogDescriptionText,
  formatLogDateTime,
  type ActivityLogRecord
} from '@/components/logs/log-display-helpers'
import { cardShell } from '@/lib/card-shell'
import { cn } from '@/lib/utils'

/** Color solo en el trazo del icono (sin caja); alineado a KPIs del dashboard */
function getLogTypeIconClass(type: string): string {
  switch (type) {
    case 'transfer':
    case 'stock_transfer':
      return 'text-violet-600 dark:text-violet-400'
    case 'sale':
    case 'sale_create':
      return 'text-emerald-600 dark:text-emerald-400'
    case 'credit_sale_create':
    case 'credit_create':
    case 'credit_payment':
    case 'credit_completed':
      return 'text-sky-600 dark:text-sky-400'
    case 'credit_cancelled':
    case 'sale_cancel':
    case 'credit_sale_cancel':
    case 'user_deactivated':
      return 'text-rose-600 dark:text-rose-400'
    case 'sale_stock_deduction':
    case 'sale_cancellation_stock_return':
    case 'sale_cancellation_stock_return_batch':
    case 'adjustment':
    case 'stock_adjustment':
      return 'text-indigo-600 dark:text-indigo-400'
    case 'product_create':
    case 'product_update':
    case 'product_edit':
    case 'product_delete':
      return 'text-indigo-600 dark:text-indigo-400'
    case 'category_create':
      return 'text-amber-600 dark:text-amber-400'
    case 'category_update':
    case 'category_edit':
    case 'category_delete':
      return 'text-violet-600 dark:text-violet-400'
    case 'client_create':
      return 'text-sky-600 dark:text-sky-400'
    case 'client_edit':
    case 'client_update':
    case 'client_delete':
      return 'text-violet-600 dark:text-violet-400'
    case 'warranty_create':
    case 'warranty_status_update':
    case 'warranty_update':
      return 'text-orange-600 dark:text-orange-400'
    case 'roles':
    case 'user_create':
    case 'user_edit':
    case 'user_update':
    case 'user_delete':
    case 'permissions_assigned':
    case 'permissions_revoked':
    case 'role_changed':
    case 'user_reactivated':
      return 'text-indigo-600 dark:text-indigo-400'
    case 'login':
      return 'text-teal-600 dark:text-teal-400'
    default:
      return 'text-zinc-500 dark:text-zinc-400'
  }
}

interface LogsTableProps {
  logs: LogEntry[]
  searchTerm?: string
  onSearchChange?: (term: string) => void
  moduleFilter?: string
  onModuleFilterChange?: (module: string) => void
  onRefresh?: () => void
  loading?: boolean
  currentPage?: number
  totalLogs?: number
  hasMore?: boolean
  onPageChange?: (page: number) => void
  onLogClick?: (log: LogEntry) => void
}

export function LogsTable({
  logs,
  searchTerm = '',
  onSearchChange,
  moduleFilter = 'all',
  onModuleFilterChange,
  onRefresh,
  loading = false,
  currentPage = 1,
  totalLogs = 0,
  hasMore = true,
  onPageChange,
  onLogClick
}: LogsTableProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [localFilterModule, setLocalFilterModule] = useState(moduleFilter)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return ArrowRightLeft
      case 'sale':
      case 'sale_create':
        return ShoppingCart
      case 'credit_sale_create':
        return CreditCard
      case 'sale_cancel':
      case 'credit_sale_cancel':
        return X
      case 'sale_stock_deduction':
        return Package
      case 'sale_cancellation_stock_return':
        return TrendingUp
      case 'product_create':
        return Plus
      case 'product_update':
      case 'product_edit':
        return Edit
      case 'product_delete':
        return Trash2
      case 'adjustment':
      case 'stock_adjustment':
        return Package
      case 'stock_transfer':
        return ArrowRightLeft
      case 'category_create':
        return Tag
      case 'category_update':
      case 'category_edit':
        return Edit
      case 'category_delete':
        return Trash2
      case 'client_create':
        return Plus
      case 'client_edit':
      case 'client_update':
        return Edit
      case 'client_delete':
        return Trash2
      case 'warranty_create':
        return Plus
      case 'warranty_status_update':
        return RefreshCw
      case 'warranty_update':
        return Edit
      case 'credit_create':
        return Receipt
      case 'credit_payment':
        return DollarSign
      case 'credit_completed':
        return CheckCircle
      case 'credit_cancelled':
        return X
      case 'roles':
      case 'user_create':
        return Plus
      case 'user_edit':
      case 'user_update':
        return Edit
      case 'user_delete':
        return Trash2
      case 'permissions_assigned':
      case 'permissions_revoked':
        return Shield
      case 'role_changed':
        return Users
      case 'user_deactivated':
        return X
      case 'user_reactivated':
        return CheckCircle
      case 'login':
        return Users
      default:
        return Users
    }
  }

  const filteredLogs = logs.filter(log => {
    const rec = log as unknown as ActivityLogRecord
    const term = (onSearchChange ? searchTerm : localSearchTerm).toLowerCase()
    const matchesSearch =
      term === '' ||
      (rec.description?.toLowerCase().includes(term) ?? false) ||
      rec.action.toLowerCase().includes(term) ||
      rec.module.toLowerCase().includes(term) ||
      rec.user_name?.toLowerCase().includes(term) ||
      JSON.stringify(rec.details).toLowerCase().includes(term) ||
      getLogDescriptionText(rec).toLowerCase().includes(term)

    const currentModuleFilter = onModuleFilterChange ? moduleFilter : localFilterModule
    let matchesModule = false
    if (currentModuleFilter === 'all') {
      matchesModule = true
    } else if (currentModuleFilter === 'credits') {
      matchesModule =
        rec.module === 'credits' ||
        (rec.module === 'sales' &&
          (rec.action === 'credit_sale_create' ||
            (rec.action === 'sale_cancel' && (rec.details as any)?.isCreditSale === true)))
    } else {
      matchesModule = rec.module === currentModuleFilter
    }

    return matchesSearch && matchesModule
  })

  const modules = [
    { value: 'all', label: 'Todos los módulos' },
    { value: 'products', label: 'Productos' },
    { value: 'clients', label: 'Clientes' },
    { value: 'sales', label: 'Ventas' },
    { value: 'credits', label: 'Créditos' },
    { value: 'warranties', label: 'Garantías' },
    { value: 'transfers', label: 'Transferencias' },
    { value: 'roles', label: 'Roles' }
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className={cardShell}>
        <CardHeader className="space-y-0 border-b border-zinc-200/90 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/80 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Activity
                  className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span>Registro de Actividades</span>
                <StoreBadge />
              </CardTitle>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                Historial completo de todas las operaciones del sistema
              </p>
            </div>
            {onRefresh && (
              <Button
                type="button"
                onClick={onRefresh}
                variant="outline"
                size="sm"
                className="h-9 shrink-0 gap-2 border-zinc-300 bg-white text-sm font-medium text-zinc-800 shadow-none hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" strokeWidth={1.5} aria-hidden />
                Actualizar
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card className={cardShell}>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:overflow-hidden sm:rounded-xl sm:border sm:border-solid sm:border-zinc-200/90 sm:bg-white sm:dark:border-zinc-700 sm:dark:bg-zinc-950/40">
            <label className="group relative flex min-h-10 flex-1 sm:min-h-11">
              <span className="sr-only">Buscar registro</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-zinc-600 dark:text-zinc-500 dark:group-focus-within:text-zinc-300"
                strokeWidth={1.5}
                aria-hidden
              />
              <input
                type="search"
                placeholder="Buscar registro..."
                value={onSearchChange ? searchTerm : localSearchTerm}
                onChange={e => {
                  const value = e.target.value
                  if (onSearchChange) onSearchChange(value)
                  else setLocalSearchTerm(value)
                }}
                className="h-10 w-full rounded-xl border border-zinc-200/90 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-100 sm:h-11 sm:rounded-none sm:border-0 sm:focus:ring-2 sm:focus:ring-violet-500/25"
              />
            </label>
            <div className="hidden w-px shrink-0 bg-zinc-200/90 dark:bg-zinc-700 sm:block" aria-hidden />
            <label className="relative flex min-h-10 sm:min-h-11 sm:min-w-[220px] sm:max-w-[280px]">
              <span className="sr-only">Filtrar por módulo</span>
              <select
                value={onModuleFilterChange ? moduleFilter : localFilterModule}
                onChange={e => {
                  const value = e.target.value
                  if (onModuleFilterChange) onModuleFilterChange(value)
                  else setLocalFilterModule(value)
                }}
                className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-zinc-200/90 bg-white py-2 pl-3 pr-10 text-sm text-zinc-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-100 sm:h-11 sm:rounded-none sm:border-0 sm:focus:ring-2 sm:focus:ring-violet-500/25"
              >
                {modules.map(module => (
                  <option key={module.value} value={module.value}>
                    {module.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                strokeWidth={1.5}
                aria-hidden
              />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className={cardShell}>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="px-4 py-14 text-center md:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                <Users className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No se encontraron registros
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                No hay actividades registradas en el sistema
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredLogs.map((log, index) => {
                const rec = log as unknown as ActivityLogRecord
                const logType = resolveLogType(rec)
                const TypeIcon = getTypeIcon(logType)
                const description = getLogDescriptionText(rec)
                const actionLabel = getLogActionLabel(rec)
                const userName = rec.user_name?.trim() || 'Desconocido'
                const rowNum = totalLogs - (currentPage - 1) * 20 - index

                return (
                  <li key={rec.id}>
                    <button
                      type="button"
                      onClick={() => onLogClick?.(log)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 md:gap-4 md:px-6 md:py-4"
                    >
                      <UserAvatar
                        name={userName}
                        seed={rec.user_id || rec.id}
                        size="md"
                        className="ring-1 ring-zinc-200/80 dark:ring-zinc-700"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-2"
                          title={description}
                        >
                          {description}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{userName}</span>
                          <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <TypeIcon
                              className={cn('h-3.5 w-3.5 shrink-0', getLogTypeIconClass(logType))}
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            {labelForLogType(logType)}
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                            ·
                          </span>
                          <Badge
                            variant="secondary"
                            className="h-5 border-0 bg-zinc-100 px-1.5 text-[10px] font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {getModuleBadgeLabel(rec)}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <time
                            dateTime={rec.created_at}
                            className="tabular-nums text-zinc-500 dark:text-zinc-400"
                          >
                            {formatLogDateTime(rec.created_at)}
                          </time>
                          <span className="rounded-md border border-zinc-200/90 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-200">
                            {actionLabel}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-zinc-400 dark:text-zinc-500">
                        {totalLogs > 0 && (
                          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                            #{rowNum}
                          </span>
                        )}
                        <Eye className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-70" strokeWidth={1.5} aria-hidden />
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {totalLogs > 20 && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-solid border-zinc-200/90 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between md:px-6"
        >
          <div className="text-center text-xs text-zinc-500 dark:text-zinc-400 sm:text-left sm:text-sm">
            <span className="hidden sm:inline">Mostrando </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {(currentPage - 1) * 20 + 1}
            </span>
            <span className="hidden sm:inline"> — </span>
            <span className="sm:hidden"> / </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {Math.min(currentPage * 20, totalLogs)}
            </span>
            <span className="hidden sm:inline"> de </span>
            <span className="sm:hidden"> / </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{totalLogs}</span>
            <span className="hidden md:inline"> registros</span>
          </div>

          <div className="flex items-center justify-center gap-1 sm:justify-end">
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="rounded-md px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:text-sm"
            >
              <span className="hidden sm:inline">Anterior</span>
              <span className="sm:hidden">‹</span>
            </button>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.ceil(totalLogs / 20) }, (_, i) => i + 1)
                .filter(
                  page =>
                    page === 1 ||
                    page === Math.ceil(totalLogs / 20) ||
                    Math.abs(page - currentPage) <= 2
                )
                .map((page, index, array) => {
                  const showEllipsis = index > 0 && page - array[index - 1] > 1
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-1 text-xs text-zinc-400 sm:text-sm">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => onPageChange?.(page)}
                        disabled={loading}
                        className={`min-w-[28px] rounded-md px-2 py-1.5 text-xs transition-colors sm:min-w-[32px] sm:text-sm ${
                          page === currentPage
                            ? 'bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-700 dark:text-zinc-50'
                            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  )
                })}
            </div>
            <button
              type="button"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= Math.ceil(totalLogs / 20) || loading}
              className="rounded-md px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:text-sm"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <span className="sm:hidden">›</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

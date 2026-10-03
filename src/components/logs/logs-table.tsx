'use client'

import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Eye, RefreshCw, Search, X } from 'lucide-react'
import type { LogEntry } from '@/lib/logs-service'
import { UserAvatar } from '@/components/ui/user-avatar'
import { StatusDot, type ReportTone } from '@/components/dashboard/report-ui'
import {
  resolveLogType,
  labelForLogType,
  getModuleBadgeLabel,
  getLogDescriptionText,
  formatLogDateTime,
  type ActivityLogRecord
} from '@/components/logs/log-display-helpers'
import { cn } from '@/lib/utils'
import { isTransfersAndReceptionsEnabled } from '@/config/feature-flags'

const PAGE_SIZE = 20

const headerIconBtnClass =
  'flex h-8 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:text-white/45 dark:hover:text-white'

const rowIconBtnClass =
  'flex h-7 w-7 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-900 dark:text-white/40 dark:hover:text-white'

const thClass = 'whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200'

const tdClass = 'px-4 py-2.5 text-zinc-800 dark:text-zinc-200'

const filterSelectWrapClass = 'relative h-8 shrink-0 border-l border-zinc-200 dark:border-white/[0.08]'

const filterSelectClass =
  'block h-full w-full cursor-pointer appearance-none truncate border-0 bg-transparent pl-3 pr-8 text-[13px] text-zinc-600 transition-colors hover:text-zinc-900 focus:outline-none dark:text-white/60 dark:hover:text-white'

const filterChevronClass =
  'pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-white/40'

const pageArrowClass =
  'flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:text-zinc-100'

function getLogTypeTone(type: string): ReportTone {
  switch (type) {
    case 'sale':
    case 'sale_create':
    case 'credit_payment':
    case 'credit_completed':
    case 'user_reactivated':
      return 'success'
    case 'credit_sale_create':
    case 'credit_create':
    case 'transfer':
    case 'stock_transfer':
      return 'info'
    case 'adjustment':
    case 'stock_adjustment':
    case 'warranty_create':
    case 'warranty_status_update':
    case 'warranty_update':
      return 'warning'
    case 'sale_cancel':
    case 'credit_sale_cancel':
    case 'credit_cancelled':
    case 'product_delete':
    case 'category_delete':
    case 'client_delete':
    case 'user_delete':
    case 'user_deactivated':
      return 'danger'
    default:
      return 'neutral'
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
  onPageChange,
  onLogClick
}: LogsTableProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)
  const [localFilterModule, setLocalFilterModule] = useState(moduleFilter)

  const currentSearch = onSearchChange ? searchTerm : localSearchTerm
  const currentModuleFilter = onModuleFilterChange ? moduleFilter : localFilterModule

  const setSearch = (value: string) => {
    if (onSearchChange) onSearchChange(value)
    else setLocalSearchTerm(value)
  }

  const filteredLogs = logs.filter(log => {
    const rec = log as unknown as ActivityLogRecord
    const term = currentSearch.toLowerCase()
    const matchesSearch =
      term === '' ||
      (rec.description?.toLowerCase().includes(term) ?? false) ||
      rec.action.toLowerCase().includes(term) ||
      rec.module.toLowerCase().includes(term) ||
      rec.user_name?.toLowerCase().includes(term) ||
      JSON.stringify(rec.details).toLowerCase().includes(term) ||
      getLogDescriptionText(rec).toLowerCase().includes(term)

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
    { value: 'egresos', label: 'Egresos' },
    { value: 'warranties', label: 'Garantías' },
    ...(isTransfersAndReceptionsEnabled()
      ? [{ value: 'transfers', label: 'Traslados' }]
      : []),
    { value: 'roles', label: 'Roles' }
  ]

  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))

  const rows = filteredLogs.map(log => {
    const rec = log as unknown as ActivityLogRecord
    const logType = resolveLogType(rec)
    return {
      log,
      rec,
      typeLabel: labelForLogType(logType),
      tone: getLogTypeTone(logType),
      description: getLogDescriptionText(rec),
      userName: rec.user_name?.trim() || 'Desconocido',
      moduleLabel: getModuleBadgeLabel(rec)
    }
  })

  return (
    <div>
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-white/[0.07] sm:items-center sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white md:text-xl">Actividades</h1>
          <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-white/50">Historial de operaciones del sistema.</p>
        </div>
        {onRefresh && (
          <div className="flex shrink-0 items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className={headerIconBtnClass}
              title="Actualizar"
              aria-label="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      <div
        className={cn(
          'casa-artesanal-preserve-surface relative mt-5 flex flex-wrap items-center rounded-xl border border-zinc-200 p-1 transition-colors md:flex-nowrap',
          'focus-within:border-zinc-300 dark:border-white/[0.1] dark:focus-within:border-white/20'
        )}
      >
        <div className="relative flex min-w-[12rem] flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-2 h-4 w-4 text-zinc-400 dark:text-white/35"
            strokeWidth={1.5}
            aria-hidden
          />
          <input
            type="search"
            autoComplete="off"
            value={currentSearch}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar actividad, usuario o detalle…"
            aria-label="Buscar actividad"
            className="h-8 w-full min-w-0 border-0 bg-transparent pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-white/35 [&::-webkit-search-cancel-button]:hidden"
          />
          {currentSearch ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-1.5 p-1 text-zinc-400 hover:text-zinc-800 dark:text-white/40 dark:hover:text-white"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          ) : null}
        </div>
        <div className={cn(filterSelectWrapClass, 'w-48')}>
          <select
            value={currentModuleFilter}
            onChange={e => {
              const value = e.target.value
              if (onModuleFilterChange) onModuleFilterChange(value)
              else setLocalFilterModule(value)
            }}
            aria-label="Filtrar por módulo"
            className={filterSelectClass}
          >
            {modules.map(module => (
              <option key={module.value} value={module.value}>
                {module.label}
              </option>
            ))}
          </select>
          <ChevronDown className={filterChevronClass} strokeWidth={1.75} aria-hidden />
        </div>
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <div className="casa-artesanal-card-surface rounded-xl border border-zinc-200 bg-white py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No se encontraron actividades</p>
          </div>
        ) : (
          <>
            <div className="casa-artesanal-card-surface divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800/80 dark:border-zinc-800 dark:bg-zinc-900/40 lg:hidden">
              {rows.map(({ log, rec, typeLabel, tone, description, userName, moduleLabel }) => (
                <button
                  key={rec.id}
                  type="button"
                  onClick={() => onLogClick?.(log)}
                  className="casa-artesanal-preserve-surface flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                >
                  <UserAvatar name={userName} seed={rec.user_id || rec.id} size="sm" className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">{description}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot tone={tone} />
                        {typeLabel}
                      </span>
                      <span className="text-zinc-300 dark:text-white/20">·</span>
                      <span>{userName}</span>
                      <span className="text-zinc-300 dark:text-white/20">·</span>
                      <span>{moduleLabel}</span>
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                      {formatLogDateTime(rec.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="casa-artesanal-card-surface hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 lg:block">
              <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col />
                  <col className="w-48" />
                  <col className="w-44" />
                  <col className="w-28" />
                  <col className="w-44" />
                  <col className="w-12" />
                </colgroup>
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/70">
                    <th className={thClass}>Actividad</th>
                    <th className={thClass}>Tipo</th>
                    <th className={thClass}>Usuario</th>
                    <th className={thClass}>Módulo</th>
                    <th className={thClass}>Fecha</th>
                    <th className="px-2 py-2.5">
                      <span className="sr-only">Ver</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ log, rec, typeLabel, tone, description, userName, moduleLabel }) => (
                    <tr
                      key={rec.id}
                      onClick={() => onLogClick?.(log)}
                      className="casa-artesanal-preserve-surface cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                    >
                      <td className={tdClass}>
                        <span className="block truncate font-medium text-zinc-900 dark:text-zinc-50" title={description}>
                          {description}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13px]">
                          <StatusDot tone={tone} className="shrink-0" />
                          <span className="truncate">{typeLabel}</span>
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span className="flex min-w-0 items-center gap-2">
                          <UserAvatar name={userName} seed={rec.user_id || rec.id} size="xs" className="shrink-0" />
                          <span className="truncate text-[13px]">{userName}</span>
                        </span>
                      </td>
                      <td className={cn(tdClass, 'truncate text-[13px] text-zinc-600 dark:text-zinc-300')}>{moduleLabel}</td>
                      <td className={cn(tdClass, 'whitespace-nowrap text-[13px] tabular-nums text-zinc-600 dark:text-zinc-300')}>
                        {formatLogDateTime(rec.created_at)}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            onLogClick?.(log)
                          }}
                          className={rowIconBtnClass}
                          title="Ver detalle"
                          aria-label="Ver detalle"
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {totalLogs > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between gap-3 sm:pr-16">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className={pageArrowClass}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => onPageChange?.(page)}
                      disabled={loading}
                      className={cn(
                        'casa-artesanal-preserve-surface flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] tabular-nums transition-colors',
                        currentPage === page
                          ? 'bg-zinc-100 font-semibold text-zinc-900 dark:bg-white/[0.1] dark:text-white'
                          : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                      )}
                    >
                      {page}
                    </button>
                  )
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="px-1 text-sm text-zinc-400 dark:text-zinc-500">
                      …
                    </span>
                  )
                }
                return null
              })}
              <button
                type="button"
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className={pageArrowClass}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

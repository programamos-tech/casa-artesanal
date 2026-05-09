'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  AlertTriangle,
  Shield,
  RefreshCw,
  X,
} from 'lucide-react'
import { Warranty } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'
import { warrantyStatusBadgeClass, warrantyStatusIconColorClass } from '@/lib/warranty-status-ui'

interface WarrantyTableProps {
  warranties: Warranty[]
  loading: boolean
  onCreate: () => void
  onView: (warranty: Warranty) => void
  onEdit: (warranty: Warranty) => void
  onStatusChange: (warrantyId: string, newStatus: string, notes?: string) => void
  onSearch: (searchTerm: string) => void
  onRefresh?: () => void
}

const badgeTint = 'casa-artesanal-preserve-surface'

const heroIconClass = 'text-indigo-600 dark:text-indigo-400'

const thClass =
  'casa-artesanal-preserve-surface whitespace-nowrap bg-zinc-100/95 px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-400'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function WarrantyTable({
  warranties,
  loading,
  onCreate,
  onView,
  onEdit: _onEdit,
  onStatusChange: _onStatusChange,
  onSearch,
  onRefresh,
}: WarrantyTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  useEffect(() => {
    const id = setTimeout(() => {
      onSearchRef.current(searchTerm)
    }, 350)
    return () => clearTimeout(id)
  }, [searchTerm])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'in_progress':
        return 'En proceso'
      case 'completed':
        return 'Completado'
      case 'rejected':
        return 'Rechazado'
      case 'discarded':
        return 'Descartado'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    const cls = cn('h-3.5 w-3.5 shrink-0', warrantyStatusIconColorClass(status))
    switch (status) {
      case 'pending':
        return <Clock className={cls} />
      case 'in_progress':
        return <AlertTriangle className={cls} />
      case 'completed':
        return <CheckCircle className={cls} />
      case 'rejected':
        return <XCircle className={cls} />
      case 'discarded':
        return <Trash2 className={cls} />
      default:
        return <Shield className={cls} />
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className={cn('relative overflow-hidden', cardShell)}>
        <CardHeader className="space-y-0 border-b border-zinc-200/80 p-4 dark:border-zinc-800 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Shield className={cn('h-5 w-5 shrink-0', heroIconClass)} strokeWidth={1.5} aria-hidden />
                <span>Gestión de garantías</span>
                <StoreBadge />
                {searchTerm.trim() ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      badgeTint,
                      'border-0 bg-zinc-100/90 text-[11px] font-normal text-zinc-600 dark:bg-zinc-900/45 dark:text-zinc-400'
                    )}
                  >
                    Búsqueda activa
                  </Badge>
                ) : null}
              </CardTitle>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {searchTerm.trim()
                  ? 'Filtra por cliente, producto o motivo'
                  : 'Administra las garantías y productos devueltos'}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400',
                      loading && 'animate-spin'
                    )}
                    strokeWidth={1.5}
                  />
                  <span className="hidden md:inline">Actualizar</span>
                </Button>
              )}
              <Button
                onClick={onCreate}
                size="sm"
                className="flex-1 border-transparent bg-brand-700 text-white hover:bg-brand-800 sm:flex-none dark:bg-brand-600 dark:hover:bg-brand-500 [&_svg]:text-white"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Nueva garantía</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="border-b border-zinc-200/80 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/25 md:px-6 md:py-4">
          <div
            className={cn(
              'casa-artesanal-preserve-surface flex min-h-11 flex-nowrap items-stretch overflow-hidden rounded-2xl border border-zinc-300/95 bg-white shadow-sm ring-1 ring-zinc-200/90 transition-[box-shadow,border-color,ring-color]',
              'dark:border-zinc-600 dark:bg-zinc-900/75 dark:ring-zinc-700/85',
              'focus-within:border-violet-400/55 focus-within:shadow-md focus-within:ring-2 focus-within:ring-violet-500/25 dark:focus-within:border-violet-500/45 dark:focus-within:ring-violet-400/20'
            )}
          >
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-violet-700 dark:text-violet-300"
                strokeWidth={2}
                aria-hidden
              />
              <input
                type="search"
                placeholder="Buscar por cliente, producto o motivo…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar garantías"
                className="h-11 w-full min-w-0 border-0 bg-transparent py-2 pl-10 pr-10 text-sm font-medium text-zinc-900 placeholder:font-normal placeholder:text-zinc-500 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando garantías…</p>
            </div>
          ) : warranties.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <Shield className={cn('h-7 w-7', heroIconClass)} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                {searchTerm.trim() ? 'Sin resultados' : 'No hay garantías'}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                {searchTerm.trim()
                  ? 'Prueba otros términos o limpia la búsqueda'
                  : 'Crea la primera con Nueva garantía'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1 bg-zinc-50/50 p-3 dark:bg-zinc-950/20 lg:hidden">
                {warranties.map((warranty, index) => (
                  <button
                    type="button"
                    key={warranty.id}
                    className="casa-artesanal-preserve-surface w-full rounded-2xl border-0 bg-transparent p-4 text-left shadow-none transition-colors hover:bg-white/75 dark:hover:bg-zinc-900/45"
                    onClick={() => onView(warranty)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                            #{warranty.id.slice(-6)}
                          </span>
                          <span className="text-xs text-zinc-400">· #{index + 1}</span>
                        </div>
                        <p className="mt-1 truncate font-medium text-zinc-900 dark:text-zinc-50">{warranty.clientName}</p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{warranty.productReceivedName}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          badgeTint,
                          'shrink-0 border-0 px-2 py-0.5 text-[11px] font-normal',
                          warrantyStatusBadgeClass(warranty.status)
                        )}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(warranty.status)}
                          {getStatusLabel(warranty.status)}
                        </span>
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-200/80 pt-3 text-left dark:border-zinc-800">
                      <div>
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Fecha</dt>
                        <dd className="mt-0.5 text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
                          {formatDate(warranty.createdAt)}
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Motivo</dt>
                        <dd className="mt-0.5 truncate text-sm text-zinc-700 dark:text-zinc-300">{warranty.reason}</dd>
                      </div>
                    </dl>
                  </button>
                ))}
              </div>

              <div className="hidden lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className={cn(thClass, 'pl-4')}>ID</th>
                        <th className={thClass}>Cliente</th>
                        <th className={thClass}>Producto</th>
                        <th className={thClass}>Motivo</th>
                        <th className={cn(thClass, 'text-center')}>Estado</th>
                        <th className={thClass}>Fecha</th>
                        <th className={cn(thClass, 'w-12 px-2')} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {warranties.map((warranty) => (
                        <tr
                          key={warranty.id}
                          className="casa-artesanal-preserve-surface cursor-pointer transition-colors hover:bg-zinc-100/90 dark:hover:bg-zinc-800/40"
                          onClick={() => onView(warranty)}
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                            #{warranty.id.slice(-6)}
                          </td>
                          <td className="max-w-[10rem] truncate px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                            {warranty.clientName}
                          </td>
                          <td className="max-w-[14rem] px-4 py-3 text-zinc-700 dark:text-zinc-300">
                            <span className="line-clamp-2" title={warranty.productReceivedName}>
                              {warranty.productReceivedName}
                            </span>
                          </td>
                          <td className="max-w-[12rem] px-4 py-3 text-zinc-600 dark:text-zinc-400">
                            <span className="line-clamp-2" title={warranty.reason}>
                              {warranty.reason}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                badgeTint,
                                'inline-flex border-0 px-2 py-0.5 text-[11px] font-normal',
                                warrantyStatusBadgeClass(warranty.status)
                              )}
                            >
                              <span className="flex items-center justify-center gap-1">
                                {getStatusIcon(warranty.status)}
                                {getStatusLabel(warranty.status)}
                              </span>
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-600 dark:text-zinc-400">
                            {formatDate(warranty.createdAt)}
                          </td>
                          <td className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                              onClick={() => onView(warranty)}
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

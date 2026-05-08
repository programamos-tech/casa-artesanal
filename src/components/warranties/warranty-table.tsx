'use client'

import { useState } from 'react'
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
  RefreshCcw
} from 'lucide-react'
import { Warranty } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'
import { cardShell } from '@/lib/card-shell'

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

/** Badges neutros; «Completado» con verde muy sutil */
function getStatusBadgeClass(status: string) {
  switch (status) {
    case 'pending':
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-200'
    case 'in_progress':
      return 'border-zinc-300 bg-zinc-100/90 text-zinc-800 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100'
    case 'completed':
      return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/40 dark:text-emerald-300/90'
    case 'rejected':
      return 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400'
    case 'discarded':
      return 'border-zinc-200/80 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-500'
    default:
      return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300'
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function WarrantyTable({
  warranties,
  loading,
  onCreate,
  onView,
  onEdit,
  onStatusChange,
  onSearch,
  onRefresh
}: WarrantyTableProps) {
  const [searchTerm, setSearchTerm] = useState('')

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
    const cls = 'h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400'
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

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    onSearch(value)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className={cardShell}>
        <CardHeader className="space-y-0 p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Shield
                  className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span>Gestión de garantías</span>
                <StoreBadge />
              </CardTitle>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Administra las garantías y productos devueltos
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCcw className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden md:inline">Actualizar</span>
                </Button>
              )}
              <Button onClick={onCreate} size="sm" className="flex-1 sm:flex-none">
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Nueva garantía</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className={cardShell}>
        <CardContent className="p-3 md:p-4">
          <div className="relative md:h-11 md:min-h-[2.75rem] md:overflow-hidden md:rounded-xl md:border md:border-zinc-200 md:bg-white md:shadow-sm dark:md:border-zinc-700 dark:md:bg-zinc-950">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-400 md:left-3" />
            <input
              type="text"
              placeholder="Buscar garantía..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-11 w-full min-w-0 rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400/25 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-500/20 md:h-full md:rounded-none md:border-0 md:focus-visible:ring-inset md:focus-visible:ring-2 md:focus-visible:ring-zinc-400/35 dark:md:bg-transparent dark:md:focus-visible:ring-zinc-500/30"
            />
          </div>
        </CardContent>
      </Card>

      <Card className={`overflow-hidden ${cardShell}`}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando garantías…</p>
            </div>
          ) : warranties.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-zinc-300 dark:border-zinc-600">
                <Shield className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">No hay garantías</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Crea la primera con <span className="font-medium text-zinc-700 dark:text-zinc-300">Nueva garantía</span>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 p-3 md:hidden">
                {warranties.map((warranty, index) => (
                  <button
                    type="button"
                    key={warranty.id}
                    className="w-full rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 text-left transition-colors hover:bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-950/30 dark:hover:bg-zinc-800/40"
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
                        <p className="mt-1 truncate font-medium text-zinc-900 dark:text-zinc-50">
                          {warranty.clientName}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {warranty.productReceivedName}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 border px-2 py-0.5 text-[11px] font-normal ${getStatusBadgeClass(warranty.status)}`}
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

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          ID
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Cliente
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Producto
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Motivo
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Estado
                        </th>
                        <th className="whitespace-nowrap bg-zinc-50/80 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-500">
                          Fecha
                        </th>
                        <th className="w-12 bg-zinc-50/80 px-2 py-3 dark:bg-zinc-900/50" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {warranties.map((warranty) => (
                        <tr
                          key={warranty.id}
                          className="cursor-pointer transition-colors hover:bg-zinc-50/90 dark:hover:bg-zinc-800/25"
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
                              className={`inline-flex border px-2 py-0.5 text-[11px] font-normal ${getStatusBadgeClass(warranty.status)}`}
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

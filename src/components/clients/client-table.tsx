'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Pause,
  Building2,
  UserRound,
} from 'lucide-react'
import { Client } from '@/types'
import { StoreBadge } from '@/components/ui/store-badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { isStoreClient } from '@/lib/client-helpers'
import { cn } from '@/lib/utils'
import { cardShell } from '@/lib/card-shell'

const badgeTint = 'casa-artesanal-preserve-surface'

/** Icono título: mismo criterio que productos / KPI stock */
const clientHeroIconClass = 'text-indigo-600 dark:text-indigo-400'

const actionIconBtnClass =
  'h-9 w-9 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'

const actionDeleteBtnClass =
  'h-9 w-9 p-0 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-red-400'

interface ClientTableProps {
  clients: Client[]
  onView: (client: Client) => void
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
  onCreate: () => void
  onRefresh?: () => void
}

/** Estado: mismos tonos que catálogo en productos (verde activo) */
function getStatusBadgeClass(status: Client['status']) {
  return status === 'active'
    ? 'border-0 bg-green-100/85 text-green-900/90 dark:bg-green-950/30 dark:text-green-300/90'
    : 'border-0 bg-zinc-100/95 text-zinc-600 dark:bg-zinc-900/55 dark:text-zinc-400'
}

/** Tipo: paleta tipo KPI reportes (violet transfer, amber, sky crédito / local) */
function getTypeBadgeClass(type: Client['type']) {
  switch (type) {
    case 'mayorista':
      return 'border-0 bg-violet-100/90 text-violet-950 dark:bg-violet-950/35 dark:text-violet-300/90'
    case 'minorista':
      return 'border-0 bg-amber-100/85 text-amber-950 dark:bg-amber-950/25 dark:text-amber-200/90'
    case 'consumidor_final':
      return 'border-0 bg-sky-100/85 text-sky-950 dark:bg-sky-950/30 dark:text-sky-300/85'
    default:
      return 'border-0 bg-zinc-100/90 text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400'
  }
}

function TypeBadgeIcon({ type }: { type: Client['type'] }) {
  switch (type) {
    case 'mayorista':
      return <Building2 className="h-3 w-3 shrink-0 text-violet-600 dark:text-violet-400" strokeWidth={2} aria-hidden />
    case 'minorista':
      return <Building2 className="h-3 w-3 shrink-0 text-amber-700 dark:text-amber-400" strokeWidth={2} aria-hidden />
    default:
      return <UserRound className="h-3 w-3 shrink-0 text-sky-700 dark:text-sky-400" strokeWidth={2} aria-hidden />
  }
}

function StatusBadgeIcon({ status }: { status: Client['status'] }) {
  return status === 'active' ? (
    <CheckCircle className="h-3 w-3 shrink-0 text-green-600 dark:text-green-400" strokeWidth={2} aria-hidden />
  ) : (
    <Pause className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" strokeWidth={2} aria-hidden />
  )
}

function getTypeLabel(type: Client['type']) {
  switch (type) {
    case 'mayorista':
      return 'Mayorista'
    case 'minorista':
      return 'Minorista'
    case 'consumidor_final':
      return 'Cliente final'
    default:
      return type
  }
}

export function ClientTable({
  clients,
  onView,
  onEdit,
  onDelete,
  onCreate,
  onRefresh,
}: ClientTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const types = ['all', 'mayorista', 'minorista', 'consumidor_final'] as const

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        const matchesSearch =
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.phone.includes(searchTerm) ||
          client.document.includes(searchTerm) ||
          client.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.state.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesType = filterType === 'all' || client.type === filterType
        return matchesSearch && matchesType
      }),
    [clients, searchTerm, filterType]
  )

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterType])

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const thClass =
    'casa-artesanal-preserve-surface whitespace-nowrap bg-zinc-100/95 px-3 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-400'

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className={cn('relative overflow-hidden', cardShell)}>
        <CardHeader className="space-y-0 border-b border-zinc-200/80 p-4 dark:border-zinc-800 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-xl">
                <Users className={cn('h-5 w-5 shrink-0', clientHeroIconClass)} strokeWidth={1.5} aria-hidden />
                <span>Gestión de clientes</span>
                <StoreBadge />
              </CardTitle>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                Administra clientes minoristas, mayoristas y consumidores finales
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {onRefresh && (
                <Button onClick={onRefresh} variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" strokeWidth={1.5} />
                  <span className="hidden md:inline">Actualizar</span>
                </Button>
              )}
              <Button
                onClick={onCreate}
                size="sm"
                className="flex-1 border-transparent bg-brand-700 text-white hover:bg-brand-800 sm:flex-none dark:bg-brand-600 dark:hover:bg-brand-500 [&_svg]:text-white"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Nuevo cliente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="border-b border-zinc-200/80 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/25 md:px-6 md:py-4">
          <div
            className={cn(
              'casa-artesanal-preserve-surface flex min-h-11 flex-nowrap items-stretch overflow-hidden rounded-2xl border border-zinc-300/95 bg-white shadow-sm ring-1 ring-zinc-200/90 transition-[box-shadow,border-color,ring-color]',
              'divide-x divide-zinc-200/85 dark:divide-zinc-600/90 dark:border-zinc-600 dark:bg-zinc-900/75 dark:ring-zinc-700/85',
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
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar cliente"
                className="h-11 w-full min-w-0 border-0 bg-transparent py-2 pl-10 pr-10 text-sm font-medium text-zinc-900 placeholder:font-normal placeholder:text-zinc-500 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-400 [&::-webkit-search-cancel-button]:hidden"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
            <div className="relative flex shrink-0 items-stretch bg-transparent">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Filtrar por tipo de cliente"
                className="h-11 min-w-[10.25rem] max-w-[42vw] cursor-pointer appearance-none border-0 bg-transparent py-2 pl-3 pr-9 text-sm font-medium text-zinc-900 focus:outline-none dark:text-zinc-100 sm:min-w-[12rem] sm:max-w-none"
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'Todos los tipos' : getTypeLabel(type)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600/80 dark:text-teal-400/90"
                aria-hidden
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <Users className={cn('h-7 w-7', clientHeroIconClass)} strokeWidth={1.5} aria-hidden />
              </div>
              <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">No se encontraron clientes</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                Ajusta la búsqueda o crea uno con <span className="font-medium text-zinc-700 dark:text-zinc-300">Nuevo cliente</span>
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1 bg-zinc-50/50 p-3 dark:bg-zinc-950/20 md:hidden">
                {paginatedClients.map((client) => (
                  <div
                    key={client.id}
                    role="button"
                    tabIndex={0}
                    className="flex w-full cursor-pointer gap-3 rounded-2xl border-0 bg-transparent p-4 text-left shadow-none transition-colors hover:bg-white/75 dark:hover:bg-zinc-900/45"
                    onClick={() => onView(client)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onView(client)
                      }
                    }}
                  >
                    <UserAvatar name={client.name} seed={client.id} size="sm" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{client.name}</p>
                          <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{client.document}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            badgeTint,
                            'inline-flex shrink-0 items-center gap-1 border-0 px-2 py-0.5 text-[11px] font-normal',
                            getStatusBadgeClass(client.status)
                          )}
                        >
                          <StatusBadgeIcon status={client.status} />
                          {client.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            badgeTint,
                            'inline-flex items-center gap-1 border-0 px-2 py-0.5 text-[11px] font-normal',
                            getTypeBadgeClass(client.type)
                          )}
                        >
                          <TypeBadgeIcon type={client.type} />
                          {getTypeLabel(client.type)}
                        </Badge>
                        {!isStoreClient(client) && (
                          <span
                            role="none"
                            className="ml-auto flex shrink-0 gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className={actionIconBtnClass}
                              title="Editar"
                              onClick={() => onEdit(client)}
                            >
                              <Edit className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className={actionDeleteBtnClass}
                              title="Eliminar"
                              onClick={() => onDelete(client)}
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th className={cn(thClass, 'pl-4')}>Cliente</th>
                        <th className={thClass}>Documento</th>
                        <th className={thClass}>Tipo</th>
                        <th className={thClass}>Correo</th>
                        <th className={thClass}>Teléfono</th>
                        <th className={cn(thClass, 'text-center')}>Estado</th>
                        <th className={cn(thClass, 'w-[7.5rem] px-2 text-right')} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {paginatedClients.map((client) => (
                        <tr
                          key={client.id}
                          className="casa-artesanal-preserve-surface cursor-pointer transition-colors hover:bg-zinc-100/90 dark:hover:bg-zinc-800/40"
                          onClick={() => onView(client)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <UserAvatar name={client.name} seed={client.id} size="sm" className="shrink-0" />
                              <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{client.name}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                            {client.document}
                          </td>
                          <td className="px-3 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                badgeTint,
                                'inline-flex items-center gap-1 border-0 px-2 py-0.5 text-[11px] font-normal',
                                getTypeBadgeClass(client.type)
                              )}
                            >
                              <TypeBadgeIcon type={client.type} />
                              {getTypeLabel(client.type)}
                            </Badge>
                          </td>
                          <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-700 dark:text-zinc-300" title={client.email || undefined}>
                            {client.email || '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">{client.phone || '—'}</td>
                          <td className="px-3 py-3 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                badgeTint,
                                'inline-flex items-center justify-center gap-1 border-0 px-2 py-0.5 text-[11px] font-normal',
                                getStatusBadgeClass(client.status)
                              )}
                            >
                              <StatusBadgeIcon status={client.status} />
                              {client.status === 'active' ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="px-1 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center justify-end gap-0.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={actionIconBtnClass}
                                title="Ver detalle"
                                onClick={() => onView(client)}
                              >
                                <Eye className="h-4 w-4" strokeWidth={1.5} />
                              </Button>
                              {!isStoreClient(client) && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className={actionIconBtnClass}
                                    title="Editar"
                                    onClick={() => onEdit(client)}
                                  >
                                    <Edit className="h-4 w-4" strokeWidth={1.5} />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className={actionDeleteBtnClass}
                                    title="Eliminar"
                                    onClick={() => onDelete(client)}
                                  >
                                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                  </Button>
                                </>
                              )}
                              {isStoreClient(client) && (
                                <span className="px-2 text-xs text-zinc-400 dark:text-zinc-500">Microtienda</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredClients.length > 0 && (
                <div className="flex flex-col items-center gap-3 border-t border-zinc-100 px-3 py-4 dark:border-zinc-800 sm:flex-row sm:justify-between sm:gap-4">
                  <p className="order-2 text-center text-sm tabular-nums text-zinc-500 dark:text-zinc-400 sm:order-1 sm:text-left">
                    Mostrando{' '}
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredClients.length)}
                    </span>{' '}
                    de <span className="font-medium text-zinc-700 dark:text-zinc-300">{filteredClients.length}</span>
                  </p>
                  {totalPages > 1 && (
                    <div className="order-1 flex flex-wrap items-center justify-center gap-3 sm:order-2">
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="min-w-[10rem] text-center text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        aria-label="Página siguiente"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
